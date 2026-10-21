// CRC32, gzip/zlib/deflate via the browser's Compression Streams API, and a ZIP inspector that lists
// entries, extracts them, detects pseudo-encryption and tries ZipCrypto passwords without uploading anything.

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array, start = 0, end = bytes.length) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ---------- Compression streams ---------- */

export type CompressionFormat = "gzip" | "deflate" | "deflate-raw";
export const maxInflatedSize = 50_000_000;

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream, limit = maxInflatedSize) {
  const reader = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(transform).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    // Stop early on decompression bombs instead of exhausting the tab's memory.
    if (total > limit) { await reader.cancel(); throw new Error("解壓縮後超過 50 MB 安全上限。 "); }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

export function compressBytes(bytes: Uint8Array, format: CompressionFormat) {
  return pipe(bytes, new CompressionStream(format));
}

export async function decompressBytes(bytes: Uint8Array, format: CompressionFormat) {
  try {
    return await pipe(bytes, new DecompressionStream(format));
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("50 MB")) throw cause;
    throw new Error("解壓縮失敗：資料不是所選格式，或內容已損毀／被截斷。 ");
  }
}

/** Guess the container from magic bytes: gzip starts with 1f 8b, zlib with a CMF/FLG pair divisible by 31. */
export function detectCompression(bytes: Uint8Array): CompressionFormat {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return "gzip";
  if (bytes.length > 1 && (bytes[0] & 0x0f) === 8 && ((bytes[0] << 8) | bytes[1]) % 31 === 0) return "deflate";
  return "deflate-raw";
}

/* ---------- ZIP ---------- */

export type ZipEntry = {
  name: string;
  method: number;
  methodLabel: string;
  flags: number;
  localFlags: number;
  crc: number;
  compressedSize: number;
  size: number;
  modified: string;
  dosTime: number;
  comment: string;
  localOffset: number;
  centralOffset: number;
  dataOffset: number;
  encrypted: boolean;
  isDirectory: boolean;
};

export type ZipArchive = { entries: ZipEntry[]; comment: string; prefixBytes: number; trailingBytes: number; fromCentralDirectory: boolean };

const methodLabels: Record<number, string> = { 0: "Stored", 8: "Deflate", 9: "Deflate64", 12: "BZIP2", 14: "LZMA", 93: "Zstandard", 95: "XZ", 99: "AES" };

function u16(bytes: Uint8Array, offset: number) { return bytes[offset] | (bytes[offset + 1] << 8); }
function u32(bytes: Uint8Array, offset: number) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }

function dosDate(date: number, time: number) {
  const year = 1980 + (date >> 9);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${year}-${pad((date >> 5) & 15)}-${pad(date & 31)} ${pad(time >> 11)}:${pad((time >> 5) & 63)}:${pad((time & 31) * 2)}`;
}

function decodeName(bytes: Uint8Array, flags: number) {
  // Bit 11 marks UTF-8 names; older archivers use code pages, so fall back to latin1 when it isn't valid UTF-8.
  try { return new TextDecoder("utf-8", { fatal: !(flags & 0x800) }).decode(bytes); } catch { return new TextDecoder("latin1").decode(bytes); }
}

function readLocal(bytes: Uint8Array, offset: number) {
  if (offset + 30 > bytes.length || u32(bytes, offset) !== 0x04034b50) throw new Error("找不到對應的 Local File Header，ZIP 可能已損毀。 ");
  return { flags: u16(bytes, offset + 6), dataOffset: offset + 30 + u16(bytes, offset + 26) + u16(bytes, offset + 28) };
}

export function parseZip(bytes: Uint8Array): ZipArchive {
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (u32(bytes, offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd >= 0) {
    const count = u16(bytes, eocd + 10);
    const size = u32(bytes, eocd + 12);
    const commentLength = u16(bytes, eocd + 20);
    if (count === 0xffff || size === 0xffffffff) throw new Error("暫不支援 ZIP64 格式。 ");
    // Archives appended to other files keep offsets relative to the ZIP start, so derive the shift from the directory position.
    const start = eocd - size;
    const shift = start - u32(bytes, eocd + 16);
    const entries: ZipEntry[] = [];
    let offset = start;
    for (let index = 0; index < count; index += 1) {
      if (offset + 46 > bytes.length || u32(bytes, offset) !== 0x02014b50) throw new Error("Central Directory 損毀，無法讀取全部檔案。 ");
      const flags = u16(bytes, offset + 8);
      const nameLength = u16(bytes, offset + 28);
      const extraLength = u16(bytes, offset + 30);
      const entryCommentLength = u16(bytes, offset + 32);
      const localOffset = u32(bytes, offset + 42) + shift;
      const name = decodeName(bytes.slice(offset + 46, offset + 46 + nameLength), flags);
      const local = readLocal(bytes, localOffset);
      const method = u16(bytes, offset + 10);
      entries.push({
        name, method, methodLabel: methodLabels[method] ?? `Method ${method}`, flags, localFlags: local.flags,
        crc: u32(bytes, offset + 16), compressedSize: u32(bytes, offset + 20), size: u32(bytes, offset + 24),
        modified: dosDate(u16(bytes, offset + 14), u16(bytes, offset + 12)), dosTime: u16(bytes, offset + 12),
        comment: decodeName(bytes.slice(offset + 46 + nameLength + extraLength, offset + 46 + nameLength + extraLength + entryCommentLength), flags),
        localOffset, centralOffset: offset, dataOffset: local.dataOffset,
        encrypted: Boolean((flags | local.flags) & 1), isDirectory: name.endsWith("/"),
      });
      offset += 46 + nameLength + extraLength + entryCommentLength;
    }
    const end = eocd + 22 + commentLength;
    return {
      entries, comment: new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(eocd + 22, end)),
      prefixBytes: Math.max(0, entries.length ? Math.min(...entries.map((entry) => entry.localOffset)) : start), trailingBytes: Math.max(0, bytes.length - end), fromCentralDirectory: true,
    };
  }
  // Without an end record (truncated or carved archives), walk local headers that carry their sizes.
  const entries: ZipEntry[] = [];
  for (let offset = 0; offset + 30 <= bytes.length; offset += 1) {
    if (u32(bytes, offset) !== 0x04034b50) continue;
    const flags = u16(bytes, offset + 6);
    const method = u16(bytes, offset + 8);
    const compressedSize = u32(bytes, offset + 18);
    const nameLength = u16(bytes, offset + 26);
    const dataOffset = offset + 30 + nameLength + u16(bytes, offset + 28);
    const name = decodeName(bytes.slice(offset + 30, offset + 30 + nameLength), flags);
    entries.push({
      name, method, methodLabel: methodLabels[method] ?? `Method ${method}`, flags, localFlags: flags,
      crc: u32(bytes, offset + 14), compressedSize, size: u32(bytes, offset + 22),
      modified: dosDate(u16(bytes, offset + 12), u16(bytes, offset + 10)), dosTime: u16(bytes, offset + 10), comment: "",
      localOffset: offset, centralOffset: -1, dataOffset, encrypted: Boolean(flags & 1), isDirectory: name.endsWith("/"),
    });
    if (compressedSize) offset = dataOffset + compressedSize - 1;
  }
  if (!entries.length) throw new Error("找不到 ZIP 簽章（PK\\x03\\x04 或 End of Central Directory）。 ");
  return { entries, comment: "", prefixBytes: entries[0].localOffset, trailingBytes: 0, fromCentralDirectory: false };
}

/* ZipCrypto (traditional PKWARE encryption) keys are updated with CRC32 steps. */
function zipCryptoKeys(password: Uint8Array) {
  const keys = new Uint32Array([0x12345678, 0x23456789, 0x34567890]);
  for (const byte of password) updateKeys(keys, byte);
  return keys;
}

function updateKeys(keys: Uint32Array, byte: number) {
  keys[0] = crcTable[(keys[0] ^ byte) & 0xff] ^ (keys[0] >>> 8);
  keys[1] = (Math.imul((keys[1] + (keys[0] & 0xff)) >>> 0, 134775813) + 1) >>> 0;
  keys[2] = crcTable[(keys[2] ^ (keys[1] >>> 24)) & 0xff] ^ (keys[2] >>> 8);
}

function zipCryptoDecrypt(data: Uint8Array, password: Uint8Array) {
  const keys = zipCryptoKeys(password);
  const output = new Uint8Array(data.length);
  for (let index = 0; index < data.length; index += 1) {
    const temp = (keys[2] | 2) & 0xffff;
    const byte = data[index] ^ ((Math.imul(temp, temp ^ 1) >>> 8) & 0xff);
    updateKeys(keys, byte);
    output[index] = byte;
  }
  return output;
}

/** Quick reject using the 12-byte header's check byte, which matches the CRC (or time, with a data descriptor). */
function zipCryptoCheck(entry: ZipEntry, data: Uint8Array, password: Uint8Array) {
  const header = zipCryptoDecrypt(data.subarray(0, 12), password);
  const expected = entry.localFlags & 8 ? (entry.dosTime >>> 8) & 0xff : (entry.crc >>> 24) & 0xff;
  return header[11] === expected;
}

async function inflateEntry(entry: ZipEntry, data: Uint8Array) {
  if (entry.method === 0) return data;
  if (entry.method === 8) return decompressBytes(data, "deflate-raw");
  throw new Error(`不支援的壓縮方法：${entry.methodLabel}。 `);
}

export type ExtractResult = { data: Uint8Array; crcOk: boolean; note: "plain" | "pseudo" | "password" };

export async function extractZipEntry(bytes: Uint8Array, entry: ZipEntry, password = ""): Promise<ExtractResult> {
  const raw = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  if (entry.method === 99) throw new Error("此檔案使用 WinZip AES 加密，瀏覽器版暫不支援解密。 ");
  if (entry.encrypted) {
    // Pseudo-encryption: the flag is set but the data was never encrypted, so it inflates with a valid CRC.
    try {
      const data = await inflateEntry(entry, raw);
      if (crc32(data) === entry.crc) return { data, crcOk: true, note: "pseudo" };
    } catch { /* really encrypted */ }
    if (!password) throw new Error("此檔案已加密，請輸入密碼或使用字典攻擊。 ");
    const key = new TextEncoder().encode(password);
    const decrypted = zipCryptoDecrypt(raw, key).subarray(12);
    let data: Uint8Array;
    try { data = await inflateEntry(entry, decrypted); } catch { throw new Error("密碼錯誤。 "); }
    if (crc32(data) !== entry.crc) throw new Error("密碼錯誤。 ");
    return { data, crcOk: true, note: "password" };
  }
  const data = await inflateEntry(entry, raw);
  return { data, crcOk: crc32(data) === entry.crc, note: "plain" };
}

/** Try every candidate password with the cheap header check first, then confirm by inflating and checking the CRC. */
export async function crackZipPassword(bytes: Uint8Array, entry: ZipEntry, candidates: Iterable<string>, onProgress?: (tried: number) => void) {
  if (!entry.encrypted || entry.method === 99) throw new Error("只有 ZipCrypto 加密的檔案可以用字典攻擊。 ");
  const raw = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  if (raw.length < 12) throw new Error("加密資料太短，無法驗證密碼。 ");
  const encoder = new TextEncoder();
  let tried = 0;
  for (const candidate of candidates) {
    tried += 1;
    if (onProgress && tried % 5000 === 0) { onProgress(tried); await new Promise((resolve) => setTimeout(resolve, 0)); }
    const key = encoder.encode(candidate);
    if (!zipCryptoCheck(entry, raw, key)) continue;
    try {
      const result = await extractZipEntry(bytes, entry, candidate);
      return { password: candidate, tried, data: result.data };
    } catch { /* header collision, keep going */ }
  }
  return { password: null, tried, data: null };
}

/** Clear the encryption bit in every local and central header so ordinary unzip tools accept a pseudo-encrypted archive. */
export function clearEncryptionFlags(bytes: Uint8Array, archive: ZipArchive) {
  const output = bytes.slice();
  for (const entry of archive.entries) {
    output[entry.localOffset + 6] &= 0xfe;
    if (entry.centralOffset >= 0) output[entry.centralOffset + 8] &= 0xfe;
  }
  return output;
}

/** Build a minimal stored ZIP; used for samples and tests. */
export function buildStoredZip(files: Array<{ name: string; data: Uint8Array; encryptedFlag?: boolean }>, comment = "") {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const flags = (file.encryptedFlag ? 1 : 0) | 0x800;
    const local = new Uint8Array(30 + name.length + file.data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 10, true); view.setUint16(6, flags, true);
    view.setUint16(10, 0, true); view.setUint16(12, 0x5821, true); view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true); view.setUint32(22, file.data.length, true); view.setUint16(26, name.length, true);
    local.set(name, 30); local.set(file.data, 30 + name.length);
    const central = new Uint8Array(46 + name.length);
    const cview = new DataView(central.buffer);
    cview.setUint32(0, 0x02014b50, true); cview.setUint16(4, 20, true); cview.setUint16(6, 10, true); cview.setUint16(8, flags, true);
    cview.setUint16(14, 0x5821, true); cview.setUint32(16, crc, true); cview.setUint32(20, file.data.length, true); cview.setUint32(24, file.data.length, true);
    cview.setUint16(28, name.length, true); cview.setUint32(42, offset, true); central.set(name, 46);
    locals.push(local); centrals.push(central); offset += local.length;
  }
  const commentBytes = encoder.encode(comment);
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22 + commentBytes.length);
  const eview = new DataView(end.buffer);
  eview.setUint32(0, 0x06054b50, true); eview.setUint16(8, files.length, true); eview.setUint16(10, files.length, true);
  eview.setUint32(12, centralSize, true); eview.setUint32(16, offset, true); eview.setUint16(20, commentBytes.length, true); end.set(commentBytes, 22);
  const parts = [...locals, ...centrals, end];
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) { output.set(part, position); position += part.length; }
  return output;
}

/** Encrypt a stored entry's data with ZipCrypto; used to build samples and tests. */
export function zipCryptoEncrypt(data: Uint8Array, password: string, crc: number) {
  const keys = zipCryptoKeys(new TextEncoder().encode(password));
  const header = new Uint8Array(12);
  for (let index = 0; index < 11; index += 1) header[index] = (index * 37 + 11) & 0xff;
  header[11] = (crc >>> 24) & 0xff;
  const plain = new Uint8Array(12 + data.length);
  plain.set(header); plain.set(data, 12);
  const output = new Uint8Array(plain.length);
  for (let index = 0; index < plain.length; index += 1) {
    const temp = (keys[2] | 2) & 0xffff;
    output[index] = plain[index] ^ ((Math.imul(temp, temp ^ 1) >>> 8) & 0xff);
    updateKeys(keys, plain[index]);
  }
  return output;
}

export const commonPasswords = [
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234", "111111", "1234567", "dragon", "123123", "baseball", "abc123",
  "football", "monkey", "letmein", "696969", "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890", "michael",
  "654321", "superman", "1qaz2wsx", "7777777", "121212", "000000", "qazwsx", "123qwe", "killer", "trustno1", "jordan", "jennifer",
  "zxcvbnm", "asdfgh", "hunter", "buster", "soccer", "harley", "batman", "andrew", "tigger", "sunshine", "iloveyou", "2000", "charlie",
  "robert", "thomas", "hockey", "ranger", "daniel", "starwars", "klaster", "112233", "george", "computer", "michelle", "jessica", "pepper",
  "1111", "zxcvbn", "555555", "11111111", "131313", "freedom", "777777", "pass", "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love", "ashley", "nicole", "chelsea", "biteme", "matthew", "access", "yankees", "987654321",
  "dallas", "austin", "thunder", "taylor", "matrix", "admin", "admin123", "root", "toor", "secret", "flag", "ctf", "password1", "passw0rd",
  "p@ssw0rd", "welcome", "hello", "test", "test123", "guest", "changeme", "default", "qwe123", "abcdef", "abcd1234", "zaq12wsx", "aa123456",
  "a123456", "123abc", "q1w2e3r4", "1q2w3e4r", "1q2w3e", "asdf1234", "88888888", "520520", "5201314", "woaini", "woaini1314", "taiwan",
  "iloveu", "admin888", "secure", "security", "hacker", "hackme", "ctf2024", "ctf2025", "ctf2026", "infected", "malware", "virus",
];

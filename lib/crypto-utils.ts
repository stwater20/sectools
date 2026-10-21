// Block ciphers, stream ciphers and pwn helpers implemented in plain TypeScript so they behave the
// same in every browser and in Node tests (Web Crypto has no ECB, DES or RC4).

export type ByteFormat = "text" | "hex" | "base64";

export function parseBytes(value: string, format: ByteFormat): Uint8Array {
  if (format === "text") return new TextEncoder().encode(value);
  if (format === "hex") {
    const cleaned = value.replace(/0x|[\s:,]/gi, "");
    if (cleaned.length % 2 || /[^0-9a-f]/i.test(cleaned)) throw new Error("Hex 必須包含偶數個十六進位字元。 ");
    return Uint8Array.from(cleaned.match(/../g) ?? [], (pair) => parseInt(pair, 16));
  }
  const cleaned = value.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Base64 格式無效。 ");
  }
}

export function formatBytes(bytes: Uint8Array, format: ByteFormat) {
  if (format === "hex") return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (format === "base64") {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/* ---------- AES (FIPS-197) ---------- */

const sbox = new Uint8Array(256);
const invSbox = new Uint8Array(256);
(() => {
  // Build the S-box from the multiplicative inverse in GF(2^8) followed by the affine transform.
  let p = 1;
  let q = 1;
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
    sbox[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  sbox[0] = 0x63;
  for (let index = 0; index < 256; index += 1) invSbox[sbox[index]] = index;
})();

function xtime(value: number) {
  return ((value << 1) ^ (value & 0x80 ? 0x1b : 0)) & 0xff;
}

function gmul(a: number, b: number) {
  let result = 0;
  while (b) {
    if (b & 1) result ^= a;
    a = xtime(a);
    b >>= 1;
  }
  return result;
}

function expandAesKey(key: Uint8Array) {
  if (![16, 24, 32].includes(key.length)) throw new Error("AES Key 必須是 16、24 或 32 bytes（AES-128／192／256）。 ");
  const nk = key.length / 4;
  const rounds = nk + 6;
  const words = new Uint8Array(16 * (rounds + 1));
  words.set(key);
  let rcon = 1;
  for (let index = nk; index < 4 * (rounds + 1); index += 1) {
    let t0 = words[4 * index - 4], t1 = words[4 * index - 3], t2 = words[4 * index - 2], t3 = words[4 * index - 1];
    if (index % nk === 0) {
      [t0, t1, t2, t3] = [sbox[t1] ^ rcon, sbox[t2], sbox[t3], sbox[t0]];
      rcon = xtime(rcon);
    } else if (nk > 6 && index % nk === 4) {
      [t0, t1, t2, t3] = [sbox[t0], sbox[t1], sbox[t2], sbox[t3]];
    }
    const base = 4 * (index - nk);
    words[4 * index] = words[base] ^ t0;
    words[4 * index + 1] = words[base + 1] ^ t1;
    words[4 * index + 2] = words[base + 2] ^ t2;
    words[4 * index + 3] = words[base + 3] ^ t3;
  }
  return { words, rounds };
}

function aesEncryptBlock(block: Uint8Array, { words, rounds }: ReturnType<typeof expandAesKey>) {
  const state = block.slice();
  for (let i = 0; i < 16; i += 1) state[i] ^= words[i];
  for (let round = 1; round <= rounds; round += 1) {
    for (let i = 0; i < 16; i += 1) state[i] = sbox[state[i]];
    // ShiftRows on a column-major state.
    let t = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t;
    t = state[2]; state[2] = state[10]; state[10] = t; t = state[6]; state[6] = state[14]; state[14] = t;
    t = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t;
    if (round !== rounds) {
      for (let c = 0; c < 4; c += 1) {
        const [a0, a1, a2, a3] = [state[4 * c], state[4 * c + 1], state[4 * c + 2], state[4 * c + 3]];
        state[4 * c] = xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3;
        state[4 * c + 1] = a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3;
        state[4 * c + 2] = a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3;
        state[4 * c + 3] = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3);
      }
    }
    for (let i = 0; i < 16; i += 1) state[i] ^= words[16 * round + i];
  }
  return state;
}

function aesDecryptBlock(block: Uint8Array, { words, rounds }: ReturnType<typeof expandAesKey>) {
  const state = block.slice();
  for (let i = 0; i < 16; i += 1) state[i] ^= words[16 * rounds + i];
  for (let round = rounds - 1; round >= 0; round -= 1) {
    let t = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t;
    t = state[2]; state[2] = state[10]; state[10] = t; t = state[6]; state[6] = state[14]; state[14] = t;
    t = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t;
    for (let i = 0; i < 16; i += 1) state[i] = invSbox[state[i]];
    for (let i = 0; i < 16; i += 1) state[i] ^= words[16 * round + i];
    if (round !== 0) {
      for (let c = 0; c < 4; c += 1) {
        const [a0, a1, a2, a3] = [state[4 * c], state[4 * c + 1], state[4 * c + 2], state[4 * c + 3]];
        state[4 * c] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
        state[4 * c + 1] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
        state[4 * c + 2] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11);
        state[4 * c + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
      }
    }
  }
  return state;
}

/* ---------- DES / 3DES (FIPS 46-3) ---------- */

const pc1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4];
const pc2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32];
const shifts = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const ip = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7];
const fp = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25];
const expansion = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1];
const pBox = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25];
const sBoxes = [
  [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
  [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
  [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
  [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
  [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
  [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
  [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
  [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
];

function toBits(bytes: Uint8Array) {
  const bits: number[] = [];
  for (const byte of bytes) for (let bit = 7; bit >= 0; bit -= 1) bits.push((byte >> bit) & 1);
  return bits;
}

function fromBits(bits: number[]) {
  const bytes = new Uint8Array(bits.length / 8);
  for (let index = 0; index < bits.length; index += 1) bytes[index >> 3] |= bits[index] << (7 - (index & 7));
  return bytes;
}

const permute = (bits: number[], table: number[]) => table.map((position) => bits[position - 1]);

function desSubkeys(key: Uint8Array) {
  const permuted = permute(toBits(key), pc1);
  let left = permuted.slice(0, 28);
  let right = permuted.slice(28);
  return shifts.map((shift) => {
    left = [...left.slice(shift), ...left.slice(0, shift)];
    right = [...right.slice(shift), ...right.slice(0, shift)];
    return permute([...left, ...right], pc2);
  });
}

function desBlock(block: Uint8Array, subkeys: number[][], decrypt: boolean) {
  const bits = permute(toBits(block), ip);
  let left = bits.slice(0, 32);
  let right = bits.slice(32);
  for (let round = 0; round < 16; round += 1) {
    const key = subkeys[decrypt ? 15 - round : round];
    const expanded = permute(right, expansion).map((bit, index) => bit ^ key[index]);
    const substituted: number[] = [];
    for (let box = 0; box < 8; box += 1) {
      const chunk = expanded.slice(box * 6, box * 6 + 6);
      const row = (chunk[0] << 1) | chunk[5];
      const column = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
      const value = sBoxes[box][row * 16 + column];
      substituted.push((value >> 3) & 1, (value >> 2) & 1, (value >> 1) & 1, value & 1);
    }
    const f = permute(substituted, pBox);
    [left, right] = [right, left.map((bit, index) => bit ^ f[index])];
  }
  return fromBits(permute([...right, ...left], fp));
}

/* ---------- Modes ---------- */

export type CipherAlgorithm = "aes" | "des" | "3des";
export type CipherMode = "ecb" | "cbc" | "ctr";

function blockCipher(algorithm: CipherAlgorithm, key: Uint8Array) {
  if (algorithm === "aes") {
    const schedule = expandAesKey(key);
    return { size: 16, encrypt: (block: Uint8Array) => aesEncryptBlock(block, schedule), decrypt: (block: Uint8Array) => aesDecryptBlock(block, schedule) };
  }
  if (algorithm === "des") {
    if (key.length !== 8) throw new Error("DES Key 必須是 8 bytes。 ");
    const keys = desSubkeys(key);
    return { size: 8, encrypt: (block: Uint8Array) => desBlock(block, keys, false), decrypt: (block: Uint8Array) => desBlock(block, keys, true) };
  }
  if (key.length !== 16 && key.length !== 24) throw new Error("3DES Key 必須是 16 或 24 bytes。 ");
  const k1 = desSubkeys(key.slice(0, 8));
  const k2 = desSubkeys(key.slice(8, 16));
  const k3 = key.length === 24 ? desSubkeys(key.slice(16, 24)) : k1;
  return {
    size: 8,
    encrypt: (block: Uint8Array) => desBlock(desBlock(desBlock(block, k1, false), k2, true), k3, false),
    decrypt: (block: Uint8Array) => desBlock(desBlock(desBlock(block, k3, true), k2, false), k1, true),
  };
}

function pkcs7Pad(data: Uint8Array, size: number) {
  const padding = size - (data.length % size);
  const output = new Uint8Array(data.length + padding);
  output.set(data);
  output.fill(padding, data.length);
  return output;
}

function pkcs7Unpad(data: Uint8Array, size: number) {
  const padding = data[data.length - 1];
  if (!padding || padding > size || data.length < padding || data.slice(-padding).some((byte) => byte !== padding)) {
    throw new Error("PKCS#7 padding 無效：Key、IV 或模式可能錯誤，或請改選「無 padding」。 ");
  }
  return data.slice(0, data.length - padding);
}

export type CipherOptions = { algorithm: CipherAlgorithm; mode: CipherMode; key: Uint8Array; iv?: Uint8Array; padding: boolean };

export function blockCipherTransform(data: Uint8Array, options: CipherOptions, decrypt: boolean) {
  const cipher = blockCipher(options.algorithm, options.key);
  const { size } = cipher;
  if (options.mode !== "ecb") {
    if (!options.iv || options.iv.length !== size) throw new Error(`IV／Nonce 必須是 ${size} bytes。 `);
  }
  if (options.mode === "ctr") {
    // CTR treats the IV as a big-endian counter block and is identical for encryption and decryption.
    const counter = options.iv!.slice();
    const output = new Uint8Array(data.length);
    for (let offset = 0; offset < data.length; offset += size) {
      const stream = cipher.encrypt(counter);
      for (let index = 0; index < size && offset + index < data.length; index += 1) output[offset + index] = data[offset + index] ^ stream[index];
      for (let index = size - 1; index >= 0; index -= 1) { counter[index] = (counter[index] + 1) & 0xff; if (counter[index]) break; }
    }
    return output;
  }
  const input = !decrypt && options.padding ? pkcs7Pad(data, size) : data;
  if (input.length % size) throw new Error(`資料長度必須是 ${size} bytes 的倍數；加密時可啟用 PKCS#7 padding。 `);
  const output = new Uint8Array(input.length);
  let previous = options.iv?.slice() ?? new Uint8Array(size);
  for (let offset = 0; offset < input.length; offset += size) {
    const block = input.slice(offset, offset + size);
    if (decrypt) {
      const plain = cipher.decrypt(block);
      if (options.mode === "cbc") for (let index = 0; index < size; index += 1) plain[index] ^= previous[index];
      output.set(plain, offset);
      previous = block;
    } else {
      if (options.mode === "cbc") for (let index = 0; index < size; index += 1) block[index] ^= previous[index];
      const encrypted = cipher.encrypt(block);
      output.set(encrypted, offset);
      previous = encrypted;
    }
  }
  return decrypt && options.padding ? pkcs7Unpad(output, size) : output;
}

export function rc4(data: Uint8Array, key: Uint8Array) {
  if (!key.length) throw new Error("RC4 Key 不可為空。 ");
  const state = Uint8Array.from({ length: 256 }, (_, index) => index);
  for (let i = 0, j = 0; i < 256; i += 1) {
    j = (j + state[i] + key[i % key.length]) & 0xff;
    [state[i], state[j]] = [state[j], state[i]];
  }
  const output = new Uint8Array(data.length);
  for (let n = 0, i = 0, j = 0; n < data.length; n += 1) {
    i = (i + 1) & 0xff;
    j = (j + state[i]) & 0xff;
    [state[i], state[j]] = [state[j], state[i]];
    output[n] = data[n] ^ state[(state[i] + state[j]) & 0xff];
  }
  return output;
}

/* ---------- Cyclic patterns (pwntools-compatible de Bruijn sequences) ---------- */

const cyclicAlphabet = "abcdefghijklmnopqrstuvwxyz";

export function cyclicPattern(length: number, subsequence = 4, alphabet = cyclicAlphabet) {
  if (!Number.isInteger(length) || length < 1 || length > 1_000_000) throw new Error("長度必須介於 1 與 1,000,000。 ");
  if (subsequence < 2 || subsequence > 8) throw new Error("子序列長度 n 必須介於 2 與 8。 ");
  const k = alphabet.length;
  const a = new Array(k * subsequence).fill(0);
  let output = "";
  // Iterative form of the standard recursive de Bruijn construction, stopping once enough characters exist.
  const stack: Array<{ t: number; p: number; j: number; phase: number }> = [{ t: 1, p: 1, j: 0, phase: 0 }];
  while (stack.length && output.length < length) {
    const frame = stack[stack.length - 1];
    if (frame.t > subsequence) {
      if (subsequence % frame.p === 0) for (let index = 1; index <= frame.p; index += 1) output += alphabet[a[index]];
      stack.pop();
      continue;
    }
    if (frame.phase === 0) {
      a[frame.t] = a[frame.t - frame.p];
      frame.phase = 1;
      frame.j = a[frame.t - frame.p] + 1;
      stack.push({ t: frame.t + 1, p: frame.p, j: 0, phase: 0 });
      continue;
    }
    if (frame.j < k) {
      a[frame.t] = frame.j;
      frame.j += 1;
      stack.push({ t: frame.t + 1, p: frame.t, j: 0, phase: 0 });
      continue;
    }
    stack.pop();
  }
  return output.slice(0, length);
}

/** Accepts 0x-prefixed integers (interpreted little-endian, like a leaked register) or raw text. */
export function cyclicFind(value: string, subsequence = 4, littleEndian = true) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("請輸入要查詢的值。 ");
  let needle: string;
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    let hex = trimmed.slice(2);
    if (hex.length % 2) hex = `0${hex}`;
    const bytes = hex.match(/../g)!.map((pair) => parseInt(pair, 16));
    if (littleEndian) bytes.reverse();
    needle = String.fromCharCode(...bytes);
  } else needle = trimmed;
  if (needle.length < subsequence) throw new Error(`至少需要 ${subsequence} 個字元才能定位。 `);
  needle = needle.slice(0, subsequence);
  const pattern = cyclicPattern(Math.min(26 ** Math.min(subsequence, 4) + subsequence, 1_000_000), subsequence);
  const index = pattern.indexOf(needle);
  return { offset: index, needle };
}

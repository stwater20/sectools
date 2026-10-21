import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blockCipherTransform, cyclicFind, cyclicPattern, formatBytes, parseBytes, rc4 } from "../lib/crypto-utils.ts";
import {
  buildStoredZip,
  clearEncryptionFlags,
  commonPasswords,
  compressBytes,
  crackZipPassword,
  crc32,
  decompressBytes,
  detectCompression,
  extractZipEntry,
  parseZip,
} from "../lib/archive-utils.ts";

const hex = (value) => parseBytes(value, "hex");
const text = (value) => new TextEncoder().encode(value);
const decode = (bytes) => new TextDecoder().decode(bytes);

test("AES matches FIPS-197 vectors for every key size and round-trips", () => {
  const plain = hex("00112233445566778899aabbccddeeff");
  const vectors = [
    ["000102030405060708090a0b0c0d0e0f", "69c4e0d86a7b0430d8cdb78070b4c55a"],
    ["000102030405060708090a0b0c0d0e0f1011121314151617", "dda97ca4864cdfe06eaf70a0ec0d7191"],
    ["000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", "8ea2b7ca516745bfeafc49904b496089"],
  ];
  for (const [key, expected] of vectors) {
    const options = { algorithm: "aes", mode: "ecb", key: hex(key), padding: false };
    const encrypted = blockCipherTransform(plain, options, false);
    assert.equal(formatBytes(encrypted, "hex"), expected);
    assert.deepEqual(blockCipherTransform(encrypted, options, true), plain);
  }
});

test("AES CBC with PKCS#7 and CTR match OpenSSL output", () => {
  const key = hex("000102030405060708090a0b0c0d0e0f");
  const iv = hex("0f0e0d0c0b0a09080706050403020100");
  const plain = text("flag{aes_mode_test_vector!}");
  const cbc = blockCipherTransform(plain, { algorithm: "aes", mode: "cbc", key, iv, padding: true }, false);
  assert.equal(formatBytes(cbc, "hex"), "c443b27d756fc96775696a6c7eae019c4c49569d4d03d50b2dd6219704a121e7");
  assert.equal(decode(blockCipherTransform(cbc, { algorithm: "aes", mode: "cbc", key, iv, padding: true }, true)), "flag{aes_mode_test_vector!}");
  const ctr = blockCipherTransform(plain, { algorithm: "aes", mode: "ctr", key, iv, padding: true }, false);
  assert.equal(formatBytes(ctr, "hex"), "46c598f5cf2d3e9b5b7293b809f1ed0f34d2fbd3103d142b1c93ec");
  assert.equal(decode(blockCipherTransform(ctr, { algorithm: "aes", mode: "ctr", key, iv, padding: true }, true)), "flag{aes_mode_test_vector!}");
  // The UI sample: AES-128-CBC with a text key and Base64 ciphertext.
  const sample = blockCipherTransform(parseBytes("UszyYayUz30UtM6z3Dx5BSufk6wI8lOz+BwkI7IHzxc=", "base64"), { algorithm: "aes", mode: "cbc", key: text("YELLOW SUBMARINE"), iv: hex("000102030405060708090a0b0c0d0e0f"), padding: true }, true);
  assert.equal(decode(sample), "flag{aes_cbc_decrypted}");
});

test("DES, 3DES and RC4 match known vectors; bad keys and padding are rejected", () => {
  const des = blockCipherTransform(hex("0123456789abcdef"), { algorithm: "des", mode: "ecb", key: hex("133457799bbcdff1"), padding: false }, false);
  assert.equal(formatBytes(des, "hex"), "85e813540f0ab405");
  const tripleKey = hex("133457799bbcdff1133457799bbcdff1133457799bbcdff1");
  assert.equal(formatBytes(blockCipherTransform(hex("0123456789abcdef"), { algorithm: "3des", mode: "ecb", key: tripleKey, padding: false }, false), "hex"), "85e813540f0ab405");
  assert.equal(formatBytes(rc4(text("Plaintext"), text("Key")), "hex"), "bbf316e8d940af0ad3");
  assert.throws(() => blockCipherTransform(text("x"), { algorithm: "aes", mode: "ecb", key: text("short"), padding: true }, false), /AES Key/);
  assert.throws(() => blockCipherTransform(text("x"), { algorithm: "aes", mode: "cbc", key: text("YELLOW SUBMARINE"), iv: text("1"), padding: true }, false), /IV／Nonce/);
  assert.throws(() => blockCipherTransform(new Uint8Array(16), { algorithm: "aes", mode: "ecb", key: text("YELLOW SUBMARINE"), padding: true }, true), /PKCS#7/);
  assert.throws(() => parseBytes("abc", "hex"), /Hex/);
});

test("cyclic patterns match pwntools and offsets are found", () => {
  assert.equal(cyclicPattern(20), "aaaabaaacaaadaaaeaaa");
  assert.equal(cyclicPattern(24, 8), "aaaaaaaabaaaaaaacaaaaaaa");
  assert.deepEqual(cyclicFind("0x61616167"), { offset: 24, needle: "gaaa" });
  assert.equal(cyclicFind("0x6161616c").offset, 44);
  assert.equal(cyclicFind("laaa").offset, 44);
  assert.equal(cyclicFind("0x6161616c", 4, false).offset, 41);
  assert.equal(cyclicFind("AAAA").offset, -1);
  assert.equal(cyclicFind("0x6161616161616164", 8).offset, 24);
  assert.throws(() => cyclicFind("ab"), /至少需要/);
});

test("compression round-trips every format and detects zlib from Python", async () => {
  for (const format of ["gzip", "deflate", "deflate-raw"]) {
    const compressed = await compressBytes(text("hello hello hello"), format);
    assert.equal(detectCompression(compressed), format);
    assert.equal(decode(await decompressBytes(compressed, format)), "hello hello hello");
  }
  const python = parseBytes("eJxLy0lMr67KyUyKz8xLy0ksSU2pVXjUMEUhOT+3oCi1uDg1RaE8syRDIaCyJCM/TwGkUg8mp6EJACAwGI8=", "base64");
  assert.equal(detectCompression(python), "deflate");
  assert.match(decode(await decompressBytes(python, "deflate")), /^flag\{zlib_inflated\}/);
  await assert.rejects(decompressBytes(text("not compressed"), "gzip"), /解壓縮失敗/);
});

test("ZIP parsing finds comments, appended archives and pseudo-encryption", async () => {
  assert.equal(crc32(text("123456789")).toString(16), "cbf43926");
  const zip = buildStoredZip([{ name: "a.txt", data: text("plain") }, { name: "flag.txt", data: text("flag{pseudo}"), encryptedFlag: true }], "hint");
  const prefixed = new Uint8Array([...text("GIF89a-junk"), ...zip]);
  const archive = parseZip(prefixed);
  assert.equal(archive.comment, "hint");
  assert.equal(archive.prefixBytes, 11);
  assert.deepEqual(archive.entries.map((entry) => [entry.name, entry.encrypted]), [["a.txt", false], ["flag.txt", true]]);
  const result = await extractZipEntry(prefixed, archive.entries[1]);
  assert.equal(result.note, "pseudo");
  assert.equal(decode(result.data), "flag{pseudo}");
  const fixed = parseZip(clearEncryptionFlags(prefixed, archive));
  assert.ok(fixed.entries.every((entry) => !entry.encrypted));
  assert.throws(() => parseZip(text("not a zip")), /找不到 ZIP 簽章/);
});

test("ZipCrypto archives from Info-ZIP are cracked with the built-in wordlist", async () => {
  const bytes = new Uint8Array(await readFile(new URL("./e2e/fixtures/encrypted.zip", import.meta.url)));
  const [entry] = parseZip(bytes).entries;
  assert.equal(entry.encrypted, true);
  await assert.rejects(extractZipEntry(bytes, entry), /已加密/);
  await assert.rejects(extractZipEntry(bytes, entry, "wrong"), /密碼錯誤/);
  const cracked = await crackZipPassword(bytes, entry, commonPasswords);
  assert.equal(cracked.password, "letmein");
  assert.equal(decode(cracked.data), "flag{zipcrypto_cracked}\n");
});

// CyberChef-style recipes: a list of byte-to-byte operations run in order, with every intermediate result kept
// so the UI can show where a chain goes wrong. Recipes (never the input) can be shared through the URL hash.
import { compressBytes, decompressBytes, detectCompression, type CompressionFormat } from "./archive-utils.ts";
import { blockCipherTransform, parseBytes, rc4, type ByteFormat, type CipherAlgorithm, type CipherMode } from "./crypto-utils.ts";
import { decodeBase, encodeBase, type BaseEncoding } from "./ctf-utils.ts";
import { decodeEscapedText, type EscapeFormat } from "./tool-utils.ts";

export type RecipeArg = { name: string; label: string; type: "text" | "number" | "select"; options?: Array<[string, string]>; value: string };
export type RecipeOperation = { id: string; label: string; group: string; args: RecipeArg[]; run: (input: Uint8Array, args: Record<string, string>) => Uint8Array | Promise<Uint8Array> };
export type RecipeStep = { op: string; args: Record<string, string>; disabled?: boolean };
export type StepResult = { output: Uint8Array | null; error: string };

const encoder = new TextEncoder();
const latin1 = new TextDecoder("latin1");
const utf8 = new TextDecoder("utf-8", { fatal: false });
const asText = (bytes: Uint8Array) => utf8.decode(bytes);
const fromText = (text: string) => encoder.encode(text);

const byteFormatOptions: Array<[string, string]> = [["text", "文字（UTF-8）"], ["hex", "Hex"], ["base64", "Base64"]];
const baseOptions: Array<[string, string]> = [["base32", "Base32"], ["base58", "Base58"], ["base62", "Base62"], ["ascii85", "Ascii85"], ["base91", "Base91"]];

function rotate(bytes: Uint8Array, shift: number) {
  const amount = ((shift % 26) + 26) % 26;
  return bytes.map((byte) => (byte >= 65 && byte <= 90 ? ((byte - 65 + amount) % 26) + 65 : byte >= 97 && byte <= 122 ? ((byte - 97 + amount) % 26) + 97 : byte));
}

function urlDecodeBytes(bytes: Uint8Array) {
  const output: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const hex = latin1.decode(bytes.subarray(index + 1, index + 3));
    if (bytes[index] === 0x25 && /^[0-9a-f]{2}$/i.test(hex)) { output.push(parseInt(hex, 16)); index += 2; }
    else output.push(bytes[index] === 0x2b ? 0x20 : bytes[index]);
  }
  return Uint8Array.from(output);
}

function urlEncodeBytes(bytes: Uint8Array) {
  let output = "";
  for (const byte of bytes) output += /[A-Za-z0-9\-_.~]/.test(String.fromCharCode(byte)) ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  return fromText(output);
}

function binaryToBytes(text: string) {
  const bits = text.replace(/[^01]/g, "");
  if (!bits || bits.length % 8) throw new Error("Binary 必須是 8 的倍數個 0／1。 ");
  return Uint8Array.from(bits.match(/.{8}/g)!, (byte) => parseInt(byte, 2));
}

function charcodesToBytes(text: string, base: number) {
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
  const values = tokens.map((token) => parseInt(token.replace(/^0x/i, ""), base));
  if (!values.length || values.some((value) => !Number.isInteger(value) || value < 0 || value > 0x10ffff)) throw new Error("Charcode 必須是 0 到 0x10FFFF 的整數。 ");
  return fromText(String.fromCodePoint(...values));
}

export const recipeOperations: RecipeOperation[] = [
  { id: "from-base64", label: "Base64 解碼", group: "編碼", args: [], run: (input) => parseBytes(asText(input), "base64") },
  { id: "to-base64", label: "Base64 編碼", group: "編碼", args: [], run: (input) => {
    let binary = ""; for (const byte of input) binary += String.fromCharCode(byte); return fromText(btoa(binary));
  } },
  { id: "from-hex", label: "Hex 解碼", group: "編碼", args: [], run: (input) => parseBytes(asText(input), "hex") },
  { id: "to-hex", label: "Hex 編碼", group: "編碼", args: [{ name: "separator", label: "分隔符號", type: "select", options: [["", "無"], [" ", "空白"], [":", "冒號"]], value: "" }], run: (input, args) => fromText(Array.from(input, (byte) => byte.toString(16).padStart(2, "0")).join(args.separator)) },
  { id: "url-decode", label: "URL 解碼", group: "編碼", args: [], run: urlDecodeBytes },
  { id: "url-encode", label: "URL 編碼", group: "編碼", args: [], run: urlEncodeBytes },
  { id: "from-base", label: "Base32／58／85／91 解碼", group: "編碼", args: [{ name: "encoding", label: "格式", type: "select", options: baseOptions, value: "base32" }], run: (input, args) => decodeBase(asText(input), args.encoding as BaseEncoding) },
  { id: "to-base", label: "Base32／58／85／91 編碼", group: "編碼", args: [{ name: "encoding", label: "格式", type: "select", options: baseOptions, value: "base32" }], run: (input, args) => fromText(encodeBase(input, args.encoding as BaseEncoding)) },
  { id: "from-binary", label: "Binary 轉 bytes", group: "編碼", args: [], run: (input) => binaryToBytes(asText(input)) },
  { id: "from-charcode", label: "Charcode 轉文字", group: "編碼", args: [{ name: "base", label: "進位", type: "select", options: [["10", "十進位"], ["16", "十六進位"], ["8", "八進位"]], value: "10" }], run: (input, args) => charcodesToBytes(asText(input), Number(args.base)) },
  { id: "unescape", label: "跳脫序列解碼", group: "編碼", args: [{ name: "format", label: "格式", type: "select", options: [["javascript", "JavaScript（\\x \\u）"], ["html-numeric", "HTML numeric entity"], ["codepoints", "Unicode code point"]], value: "javascript" }], run: (input, args) => fromText(decodeEscapedText(asText(input), args.format as EscapeFormat)) },
  { id: "rot13", label: "ROT13／Caesar", group: "密碼", args: [{ name: "shift", label: "位移", type: "number", value: "13" }], run: (input, args) => rotate(input, Number(args.shift) || 0) },
  { id: "rot47", label: "ROT47", group: "密碼", args: [], run: (input) => input.map((byte) => (byte >= 33 && byte <= 126 ? ((byte - 33 + 47) % 94) + 33 : byte)) },
  { id: "xor", label: "XOR", group: "密碼", args: [{ name: "key", label: "Key", type: "text", value: "" }, { name: "format", label: "Key 格式", type: "select", options: byteFormatOptions, value: "hex" }], run: (input, args) => {
    const key = parseBytes(args.key, args.format as ByteFormat);
    if (!key.length) throw new Error("XOR Key 不可為空。 ");
    return input.map((byte, index) => byte ^ key[index % key.length]);
  } },
  { id: "block-decrypt", label: "AES／DES 解密", group: "密碼", args: [
    { name: "algorithm", label: "演算法", type: "select", options: [["aes", "AES"], ["des", "DES"], ["3des", "3DES"]], value: "aes" },
    { name: "mode", label: "模式", type: "select", options: [["cbc", "CBC"], ["ecb", "ECB"], ["ctr", "CTR"]], value: "cbc" },
    { name: "key", label: "Key（Hex）", type: "text", value: "" },
    { name: "iv", label: "IV（Hex）", type: "text", value: "" },
  ], run: (input, args) => blockCipherTransform(input, { algorithm: args.algorithm as CipherAlgorithm, mode: args.mode as CipherMode, key: parseBytes(args.key, "hex"), iv: args.mode === "ecb" ? undefined : parseBytes(args.iv, "hex"), padding: args.mode !== "ctr" }, true) },
  { id: "rc4", label: "RC4", group: "密碼", args: [{ name: "key", label: "Key", type: "text", value: "" }, { name: "format", label: "Key 格式", type: "select", options: byteFormatOptions, value: "text" }], run: (input, args) => rc4(input, parseBytes(args.key, args.format as ByteFormat)) },
  { id: "inflate", label: "解壓縮（gzip／zlib／deflate）", group: "壓縮", args: [], run: (input) => decompressBytes(input, detectCompression(input)) },
  { id: "compress", label: "壓縮", group: "壓縮", args: [{ name: "format", label: "格式", type: "select", options: [["gzip", "gzip"], ["deflate", "zlib"], ["deflate-raw", "Raw deflate"]], value: "gzip" }], run: (input, args) => compressBytes(input, args.format as CompressionFormat) },
  { id: "reverse", label: "反轉", group: "文字", args: [], run: (input) => input.slice().reverse() },
  { id: "upper", label: "轉大寫", group: "文字", args: [], run: (input) => fromText(asText(input).toUpperCase()) },
  { id: "lower", label: "轉小寫", group: "文字", args: [], run: (input) => fromText(asText(input).toLowerCase()) },
  { id: "strip-whitespace", label: "移除空白與換行", group: "文字", args: [], run: (input) => input.filter((byte) => ![9, 10, 13, 32].includes(byte)) },
  { id: "regex-extract", label: "Regex 擷取", group: "文字", args: [{ name: "pattern", label: "Regex", type: "text", value: "flag\\{[^}]*\\}" }], run: (input, args) => {
    let pattern: RegExp;
    try { pattern = new RegExp(args.pattern, "g"); } catch { throw new Error("Regex 語法錯誤。 "); }
    return fromText((asText(input).match(pattern) ?? []).join("\n"));
  } },
];

export function findOperation(id: string) {
  return recipeOperations.find((operation) => operation.id === id);
}

export function createStep(id: string): RecipeStep {
  const operation = findOperation(id);
  if (!operation) throw new Error(`未知的操作：${id}`);
  return { op: id, args: Object.fromEntries(operation.args.map((arg) => [arg.name, arg.value])) };
}

/** Run every enabled step in order; the first failure stops the chain and later steps report nothing. */
export async function runRecipe(input: Uint8Array, steps: RecipeStep[]): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let current: Uint8Array | null = input;
  for (const step of steps) {
    if (!current) { results.push({ output: null, error: "" }); continue; }
    if (step.disabled) { results.push({ output: current, error: "" }); continue; }
    const operation = findOperation(step.op);
    try {
      if (!operation) throw new Error(`未知的操作：${step.op}`);
      current = await operation.run(current, step.args);
      results.push({ output: current, error: "" });
    } catch (cause) {
      results.push({ output: null, error: cause instanceof Error ? cause.message : "處理失敗。 " });
      current = null;
    }
  }
  return results;
}

export function encodeRecipe(steps: RecipeStep[]) {
  const json = JSON.stringify(steps.map((step) => (step.disabled ? step : { op: step.op, args: step.args })));
  let binary = "";
  for (const byte of encoder.encode(json)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a shared recipe, keeping only known operations and string arguments. */
export function decodeRecipe(value: string): RecipeStep[] {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(utf8.decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
    if (!Array.isArray(parsed)) throw new Error("not a list");
    return parsed.slice(0, 50).flatMap((item) => {
      if (!item || typeof item !== "object" || typeof item.op !== "string" || !findOperation(item.op)) return [];
      const step = createStep(item.op);
      for (const name of Object.keys(step.args)) if (typeof item.args?.[name] === "string") step.args[name] = item.args[name];
      return [{ ...step, ...(item.disabled === true ? { disabled: true } : {}) }];
    });
  } catch {
    throw new Error("分享的 Recipe 格式無效。 ");
  }
}

// PHP serialize() parsing/rebuilding and a static Python pickle disassembler. Nothing here executes the data:
// pickles are only walked opcode by opcode, like `pickletools.dis`, to show what loading them would import.

/* ---------- PHP serialize ---------- */

// Maps keep entries in order (JS objects would move integer keys first) and floats stay distinct from ints,
// so editing and re-serializing preserves PHP semantics. Objects carry a "__class__" pseudo-entry.
export type PhpMap = { entries: Array<[string, PhpValue]> };
export class PhpFloat { readonly value: number; constructor(value: number) { this.value = value; } }
export type PhpValue = null | boolean | number | string | PhpFloat | PhpMap;

const utf8 = new TextEncoder();
const isMap = (value: PhpValue): value is PhpMap => typeof value === "object" && value !== null && !(value instanceof PhpFloat);
const entry = (map: PhpMap, key: string) => map.entries.find(([name]) => name === key)?.[1];

/** Parse PHP serialize() output. Objects become maps whose first entry is ["__class__", name]. */
export function parsePhpSerialized(input: string): PhpValue {
  const bytes = utf8.encode(input);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let offset = 0;
  const fail = (message: string): never => { throw new Error(`位置 ${offset}：${message}`); };
  const expect = (character: string) => { if (String.fromCharCode(bytes[offset]) !== character) fail(`預期「${character}」`); offset += 1; };
  const readUntil = (character: string) => {
    const end = bytes.indexOf(character.charCodeAt(0), offset);
    if (end < 0) fail(`找不到「${character}」`);
    const text = decoder.decode(bytes.subarray(offset, end));
    offset = end + 1;
    return text;
  };
  const readString = () => {
    const length = Number(readUntil(":"));
    if (!Number.isInteger(length) || length < 0) fail("字串長度無效");
    expect('"');
    if (offset + length > bytes.length) fail("字串長度超過資料結尾");
    const text = decoder.decode(bytes.subarray(offset, offset + length));
    offset += length;
    if (bytes[offset] !== 0x22) fail(`宣告長度 ${length} 與實際字串不符（PHP 以 UTF-8 bytes 計算）`);
    offset += 1;
    return text;
  };
  const readEntries = (count: number, map: PhpMap) => {
    expect("{");
    for (let index = 0; index < count; index += 1) {
      const key = readValue();
      if (typeof key !== "string" && typeof key !== "number") fail("陣列鍵只能是整數或字串");
      map.entries.push([String(key), readValue()]);
    }
    expect("}");
    return map;
  };
  const readValue = (): PhpValue => {
    if (offset >= bytes.length) fail("資料提前結束");
    const type = String.fromCharCode(bytes[offset]);
    offset += 1;
    if (type === "N") { expect(";"); return null; }
    expect(":");
    switch (type) {
      case "b": return readUntil(";") === "1";
      case "i": { const value = Number(readUntil(";")); if (!Number.isFinite(value)) fail("整數無效"); return value; }
      case "d": { const value = readUntil(";"); return new PhpFloat(value === "INF" ? Infinity : value === "-INF" ? -Infinity : Number(value)); }
      case "s": { const value = readString(); expect(";"); return value; }
      case "r": case "R": return { entries: [[type === "r" ? "__ref__" : "__REF__", Number(readUntil(";"))]] };
      case "a": return readEntries(Number(readUntil(":")), { entries: [] });
      case "O": {
        const name = readString();
        expect(":");
        return readEntries(Number(readUntil(":")), { entries: [["__class__", name]] });
      }
      case "C": {
        const name = readString();
        expect(":");
        const length = Number(readUntil(":"));
        expect("{");
        const data = decoder.decode(bytes.subarray(offset, offset + length));
        offset += length;
        expect("}");
        return { entries: [["__class__", name], ["__custom__", data]] };
      }
      case "E": { const value = readString(); expect(";"); return { entries: [["__enum__", value]] }; }
      default: return fail(`不支援的型別「${type}」`);
    }
  };
  const value = readValue();
  if (offset !== bytes.length) fail("結尾有多餘資料");
  return value;
}

/** Rebuild PHP serialize() output, recomputing every string length in UTF-8 bytes. */
export function serializePhp(value: PhpValue): string {
  const string = (text: string) => `s:${utf8.encode(text).length}:"${text}";`;
  const arrayKey = (text: string) => (/^-?(0|[1-9]\d*)$/.test(text) && Number.isSafeInteger(Number(text)) ? `i:${text};` : string(text));
  if (value === null) return "N;";
  if (typeof value === "boolean") return `b:${value ? 1 : 0};`;
  if (typeof value === "number") return Number.isInteger(value) ? `i:${value};` : `d:${value};`;
  if (typeof value === "string") return string(value);
  if (value instanceof PhpFloat) return `d:${value.value === Infinity ? "INF" : value.value === -Infinity ? "-INF" : Number.isNaN(value.value) ? "NAN" : value.value};`;
  const [first] = value.entries;
  if (value.entries.length === 1 && (first[0] === "__ref__" || first[0] === "__REF__")) return `${first[0] === "__ref__" ? "r" : "R"}:${first[1]};`;
  if (value.entries.length === 1 && first[0] === "__enum__" && typeof first[1] === "string") return `E:${utf8.encode(first[1]).length}:"${first[1]}";`;
  const className = entry(value, "__class__");
  const custom = entry(value, "__custom__");
  const items = value.entries.filter(([name]) => name !== "__class__" && name !== "__custom__");
  if (typeof className === "string") {
    const name = `${utf8.encode(className).length}:"${className}"`;
    if (typeof custom === "string") return `C:${name}:${utf8.encode(custom).length}:{${custom}}`;
    return `O:${name}:${items.length}:{${items.map(([key, item]) => string(key) + serializePhp(item)).join("")}}`;
  }
  return `a:${items.length}:{${items.map(([key, item]) => arrayKey(key) + serializePhp(item)).join("")}}`;
}

/** Class names found in the value, so reviewers can look for __wakeup/__destruct gadgets. */
export function phpClasses(value: PhpValue, found = new Set<string>()) {
  if (isMap(value)) {
    const className = entry(value, "__class__");
    if (typeof className === "string") found.add(className);
    for (const [, item] of value.entries) phpClasses(item, found);
  }
  return [...found];
}

/** JSON text that keeps entry order and writes floats with a decimal point (2.0) so they stay floats. */
export function phpToJson(value: PhpValue, indent = ""): string {
  if (value instanceof PhpFloat) return Number.isFinite(value.value) ? (Number.isInteger(value.value) ? value.value.toFixed(1) : String(value.value)) : String(value.value);
  if (!isMap(value)) return JSON.stringify(value);
  if (!value.entries.length) return "{}";
  const inner = `${indent}  `;
  return `{\n${value.entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${phpToJson(item, inner)}`).join(",\n")}\n${indent}}`;
}

/** Parse JSON back into PHP values while preserving key order; numbers with "." or "e" become floats. */
export function phpFromJson(text: string): PhpValue {
  let offset = 0;
  const fail = (message: string): never => { throw new Error(`JSON 第 ${offset} 個字元：${message}`); };
  const skip = () => { while (/\s/.test(text[offset] ?? "")) offset += 1; };
  const readString = () => {
    const match = /^"(?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/.exec(text.slice(offset));
    if (!match) return fail("字串格式錯誤");
    offset += match[0].length;
    return JSON.parse(match[0]) as string;
  };
  const readValue = (): PhpValue => {
    skip();
    const character = text[offset];
    if (character === "{") {
      offset += 1;
      const map: PhpMap = { entries: [] };
      skip();
      if (text[offset] === "}") { offset += 1; return map; }
      for (;;) {
        skip();
        if (text[offset] !== '"') fail("物件鍵必須是字串");
        const key = readString();
        skip();
        if (text[offset] !== ":") fail("缺少冒號");
        offset += 1;
        map.entries.push([key, readValue()]);
        skip();
        if (text[offset] === ",") { offset += 1; continue; }
        if (text[offset] === "}") { offset += 1; return map; }
        fail("缺少逗號或右大括號");
      }
    }
    if (character === "[") {
      offset += 1;
      const map: PhpMap = { entries: [] };
      skip();
      if (text[offset] === "]") { offset += 1; return map; }
      for (;;) {
        map.entries.push([String(map.entries.length), readValue()]);
        skip();
        if (text[offset] === ",") { offset += 1; continue; }
        if (text[offset] === "]") { offset += 1; return map; }
        fail("缺少逗號或右中括號");
      }
    }
    if (character === '"') return readString();
    for (const [word, value] of [["true", true], ["false", false], ["null", null], ["Infinity", new PhpFloat(Infinity)], ["-Infinity", new PhpFloat(-Infinity)], ["NaN", new PhpFloat(NaN)]] as const) {
      if (text.startsWith(word, offset)) { offset += word.length; return value; }
    }
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(offset));
    if (!match) return fail("無法辨識的值");
    offset += match[0].length;
    return match[2] || match[3] ? new PhpFloat(Number(match[0])) : Number(match[0]);
  };
  const value = readValue();
  skip();
  if (offset !== text.length) fail("結尾有多餘內容");
  return value;
}

/** Accept raw serialize() output, or the same thing URL-encoded or Base64-encoded as it appears in cookies. */
export function normalizePhpInput(input: string) {
  const trimmed = input.trim();
  const looksSerialized = (text: string) => /^(?:[aOCsibdNrRE][:;])/.test(text);
  if (looksSerialized(trimmed)) return { text: trimmed, decoded: "" };
  if (/%[0-9a-f]{2}/i.test(trimmed)) {
    try { const text = decodeURIComponent(trimmed.replace(/\+/g, " ")); if (looksSerialized(text)) return { text, decoded: "URL decode" }; } catch { /* not URL encoded */ }
  }
  try {
    const cleaned = decodeURIComponent(trimmed).replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    const binary = atob(cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, "="));
    const text = new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
    if (looksSerialized(text)) return { text, decoded: "Base64 decode" };
  } catch { /* not Base64 */ }
  return { text: trimmed, decoded: "" };
}

/* ---------- Python pickle ---------- */

type ArgKind = "none" | "u1" | "u2" | "i4" | "u4" | "u8" | "f8" | "line" | "line2" | "bytes1" | "bytes4" | "bytes8" | "str1" | "str4" | "str8" | "long1" | "long4";

const opcodes: Record<number, [string, ArgKind]> = {};
const define = (code: string, name: string, arg: ArgKind) => { opcodes[code.charCodeAt(0)] = [name, arg]; };
([
  ["(", "MARK", "none"], [".", "STOP", "none"], ["0", "POP", "none"], ["1", "POP_MARK", "none"], ["2", "DUP", "none"],
  ["F", "FLOAT", "line"], ["I", "INT", "line"], ["J", "BININT", "i4"], ["K", "BININT1", "u1"], ["L", "LONG", "line"], ["M", "BININT2", "u2"],
  ["N", "NONE", "none"], ["P", "PERSID", "line"], ["Q", "BINPERSID", "none"], ["R", "REDUCE", "none"], ["S", "STRING", "line"],
  ["T", "BINSTRING", "str4"], ["U", "SHORT_BINSTRING", "str1"], ["V", "UNICODE", "line"], ["X", "BINUNICODE", "str4"],
  ["a", "APPEND", "none"], ["b", "BUILD", "none"], ["c", "GLOBAL", "line2"], ["d", "DICT", "none"], ["}", "EMPTY_DICT", "none"],
  ["e", "APPENDS", "none"], ["g", "GET", "line"], ["h", "BINGET", "u1"], ["i", "INST", "line2"], ["j", "LONG_BINGET", "u4"],
  ["l", "LIST", "none"], ["]", "EMPTY_LIST", "none"], ["o", "OBJ", "none"], ["p", "PUT", "line"], ["q", "BINPUT", "u1"],
  ["r", "LONG_BINPUT", "u4"], ["s", "SETITEM", "none"], ["t", "TUPLE", "none"], [")", "EMPTY_TUPLE", "none"], ["u", "SETITEMS", "none"],
  ["G", "BINFLOAT", "f8"], ["\x80", "PROTO", "u1"], ["\x81", "NEWOBJ", "none"], ["\x82", "EXT1", "u1"], ["\x83", "EXT2", "u2"],
  ["\x84", "EXT4", "u4"], ["\x85", "TUPLE1", "none"], ["\x86", "TUPLE2", "none"], ["\x87", "TUPLE3", "none"], ["\x88", "NEWTRUE", "none"],
  ["\x89", "NEWFALSE", "none"], ["\x8a", "LONG1", "long1"], ["\x8b", "LONG4", "long4"], ["B", "BINBYTES", "bytes4"], ["C", "SHORT_BINBYTES", "bytes1"],
  ["\x8c", "SHORT_BINUNICODE", "str1"], ["\x8d", "BINUNICODE8", "str8"], ["\x8e", "BINBYTES8", "bytes8"], ["\x8f", "EMPTY_SET", "none"],
  ["\x90", "ADDITEMS", "none"], ["\x91", "FROZENSET", "none"], ["\x92", "NEWOBJ_EX", "none"], ["\x93", "STACK_GLOBAL", "none"],
  ["\x94", "MEMOIZE", "none"], ["\x95", "FRAME", "u8"], ["\x96", "BYTEARRAY8", "bytes8"], ["\x97", "NEXT_BUFFER", "none"], ["\x98", "READONLY_BUFFER", "none"],
] as Array<[string, string, ArgKind]>).forEach(([code, name, arg]) => define(code, name, arg));

export type PickleOp = { offset: number; name: string; arg: string };
export type PickleImport = { module: string; name: string; offset: number; risk: "high" | "medium" | "low" };
export type PickleReport = { ops: PickleOp[]; imports: PickleImport[]; protocol: number; calls: number; complete: boolean };

const dangerousModules = /^(os|posix|nt|subprocess|sys|importlib|socket|pty|shutil|runpy|code|codeop|ctypes|multiprocessing|webbrowser|pickle|_pickle|marshal|types|commands|platform|asyncio|http|urllib|requests|telnetlib|ftplib)(\.|$)/;
const dangerousNames = /^(eval|exec|compile|open|__import__|getattr|setattr|delattr|globals|locals|vars|system|popen|spawn\w*|exec\w*|call|run|check_output|check_call|Popen|load|loads|remove|unlink|rmtree)$/;

function classifyImport(module: string, name: string): PickleImport["risk"] {
  const builtin = module === "builtins" || module === "__builtin__";
  if (dangerousModules.test(module) || (builtin && dangerousNames.test(name))) return "high";
  if (builtin) return "low";
  if (dangerousNames.test(name)) return "medium";
  return /^(collections|datetime|decimal|numpy|copy_reg|copyreg|_codecs|torch|pandas)(\.|$)/.test(module) ? "low" : "medium";
}

/** Walk the opcode stream without executing it. A small symbolic stack recovers STACK_GLOBAL module/name pairs. */
export function disassemblePickle(bytes: Uint8Array, maxOps = 100_000): PickleReport {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const latin1 = new TextDecoder("latin1");
  const text = new TextDecoder("utf-8", { fatal: false });
  const ops: PickleOp[] = [];
  const imports: PickleImport[] = [];
  const stack: Array<string | null | typeof mark> = [];
  const memo = new Map<number, string | null>();
  const mark = Symbol("mark");
  let protocol = 0;
  let calls = 0;
  let offset = 0;
  let complete = false;
  const need = (size: number) => { if (offset + size > bytes.length) throw new Error(`位置 ${offset}：資料在 opcode 參數中途結束。 `); };
  const readLine = () => {
    const end = bytes.indexOf(0x0a, offset);
    if (end < 0) throw new Error(`位置 ${offset}：找不到換行結尾。 `);
    const line = latin1.decode(bytes.subarray(offset, end));
    offset = end + 1;
    return line;
  };
  const popMark = () => { while (stack.length && stack[stack.length - 1] !== mark) stack.pop(); stack.pop(); };
  const preview = (value: string) => JSON.stringify(value.length > 120 ? `${value.slice(0, 120)}…` : value);
  while (offset < bytes.length && ops.length < maxOps) {
    const start = offset;
    const code = bytes[offset];
    const spec = opcodes[code];
    if (!spec) throw new Error(`位置 ${offset}：未知的 opcode 0x${code.toString(16).padStart(2, "0")}，可能不是 pickle 資料。 `);
    offset += 1;
    const [name, kind] = spec;
    let arg = "";
    let pushed: string | null | undefined;
    switch (kind) {
      case "u1": need(1); arg = String(bytes[offset]); offset += 1; break;
      case "u2": need(2); arg = String(view.getUint16(offset, true)); offset += 2; break;
      case "i4": need(4); arg = String(view.getInt32(offset, true)); offset += 4; break;
      case "u4": need(4); arg = String(view.getUint32(offset, true)); offset += 4; break;
      case "u8": need(8); arg = String(view.getBigUint64(offset, true)); offset += 8; break;
      case "f8": need(8); arg = String(view.getFloat64(offset, false)); offset += 8; break;
      case "line": arg = readLine(); break;
      case "line2": { const first = readLine(); const second = readLine(); arg = `${first} ${second}`; break; }
      case "long1": case "long4": {
        const size = kind === "long1" ? (need(1), bytes[offset]) : (need(4), view.getUint32(offset, true));
        offset += kind === "long1" ? 1 : 4;
        need(size);
        let value = 0n;
        for (let index = size - 1; index >= 0; index -= 1) value = (value << 8n) | BigInt(bytes[offset + index]);
        if (size && bytes[offset + size - 1] & 0x80) value -= 1n << BigInt(size * 8);
        offset += size;
        arg = value.toString();
        break;
      }
      default: if (kind !== "none") {
        const width = kind.endsWith("1") ? 1 : kind.endsWith("4") ? 4 : 8;
        need(width);
        const size = width === 1 ? bytes[offset] : width === 4 ? view.getUint32(offset, true) : Number(view.getBigUint64(offset, true));
        offset += width;
        need(size);
        const data = bytes.subarray(offset, offset + size);
        offset += size;
        if (kind.startsWith("str")) { const value = name.includes("UNICODE") ? text.decode(data) : latin1.decode(data); arg = preview(value); pushed = value; }
        else arg = `${size} bytes`;
      }
    }
    if (name === "STRING" || name === "UNICODE") { pushed = name === "STRING" ? arg.replace(/^(['"])(.*)\1$/, "$2") : arg; arg = name === "STRING" ? arg : preview(arg); }
    ops.push({ offset: start, name, arg });
    // Symbolic stack effects: only strings matter (for STACK_GLOBAL), everything else is a placeholder.
    switch (name) {
      case "PROTO": protocol = Number(arg); break;
      case "MARK": stack.push(mark); break;
      case "STOP": complete = true; break;
      case "POP": stack.pop(); break;
      case "POP_MARK": popMark(); break;
      case "DUP": stack.push(stack[stack.length - 1] ?? null); break;
      case "GLOBAL": case "INST": {
        const [moduleName, item] = arg.split(" ");
        imports.push({ module: moduleName, name: item, offset: start, risk: classifyImport(moduleName, item) });
        if (name === "INST") { popMark(); calls += 1; }
        stack.push(null);
        break;
      }
      case "STACK_GLOBAL": {
        const item = stack.pop(); const source = stack.pop();
        const moduleName = typeof source === "string" ? source : "?";
        const itemName = typeof item === "string" ? item : "?";
        imports.push({ module: moduleName, name: itemName, offset: start, risk: moduleName === "?" ? "medium" : classifyImport(moduleName, itemName) });
        stack.push(null);
        break;
      }
      case "PUT": case "BINPUT": case "LONG_BINPUT": { const top = stack[stack.length - 1]; memo.set(Number(arg), typeof top === "string" ? top : null); break; }
      case "MEMOIZE": { const top = stack[stack.length - 1]; memo.set(memo.size, typeof top === "string" ? top : null); break; }
      case "GET": case "BINGET": case "LONG_BINGET": stack.push(memo.get(Number(arg)) ?? null); break;
      case "REDUCE": case "NEWOBJ": stack.pop(); stack.pop(); stack.push(null); calls += 1; break;
      case "NEWOBJ_EX": stack.pop(); stack.pop(); stack.pop(); stack.push(null); calls += 1; break;
      case "OBJ": popMark(); stack.push(null); calls += 1; break;
      case "BUILD": stack.pop(); break;
      case "APPEND": case "SETITEM": stack.pop(); if (name === "SETITEM") stack.pop(); break;
      case "APPENDS": case "SETITEMS": case "ADDITEMS": popMark(); break;
      case "TUPLE": case "LIST": case "DICT": case "FROZENSET": popMark(); stack.push(null); break;
      case "TUPLE1": stack.pop(); stack.push(null); break;
      case "TUPLE2": stack.pop(); stack.pop(); stack.push(null); break;
      case "TUPLE3": stack.pop(); stack.pop(); stack.pop(); stack.push(null); break;
      case "BINPERSID": stack.pop(); stack.push(null); break;
      case "FRAME": case "READONLY_BUFFER": break;
      default: stack.push(pushed ?? null);
    }
    if (complete) break;
  }
  return { ops, imports, protocol, calls, complete };
}

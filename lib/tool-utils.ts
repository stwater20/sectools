const inputLimit = 2_000_000;

export function assertSafeInput(value: string) {
  if (value.length > inputLimit) {
    throw new Error("輸入內容超過 2 MB 安全上限，請縮小資料後再試。 ");
  }
}

export function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function utf8ToBase64(value: string) {
  assertSafeInput(value);
  return bytesToBase64(new TextEncoder().encode(value).buffer);
}

export function base64ToUtf8(value: string) {
  assertSafeInput(value);
  const normalized = value.replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function decodeJwtPart(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(base64ToUtf8(padded));
}

function ipv4ToNumber(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    throw new Error("請輸入有效的 IPv4 位址，例如 192.168.10.42/24。 ");
  }
  return parts.reduce((total, part) => ((total << 8) | Number(part)) >>> 0, 0) >>> 0;
}

function numberToIpv4(value: number) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

export function calculateCidr(value: string) {
  const [ip, prefixText] = value.trim().split("/");
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error("CIDR 前綴必須介於 0 到 32。 ");
  }
  const ipNumber = ipv4ToNumber(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipNumber & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, total - 2);

  return {
    network: numberToIpv4(network),
    broadcast: numberToIpv4(broadcast),
    subnetMask: numberToIpv4(mask),
    firstHost: numberToIpv4(prefix >= 31 ? network : network + 1),
    lastHost: numberToIpv4(prefix >= 31 ? broadcast : broadcast - 1),
    totalAddresses: total.toLocaleString("en-US"),
    usableHosts: usable.toLocaleString("en-US"),
  };
}

export function calculateEntropy(value: string) {
  if (!value.length) return { bitsPerSymbol: 0, totalBits: 0, uniqueSymbols: 0 };
  const counts = new Map<string, number>();
  for (const character of value) counts.set(character, (counts.get(character) ?? 0) + 1);
  let bitsPerSymbol = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    bitsPerSymbol -= probability * Math.log2(probability);
  }
  return {
    bitsPerSymbol,
    totalBits: bitsPerSymbol * value.length,
    uniqueSymbols: counts.size,
  };
}

export type CvssMetrics = {
  av: "N" | "A" | "L" | "P";
  ac: "L" | "H";
  pr: "N" | "L" | "H";
  ui: "N" | "R";
  s: "U" | "C";
  c: "N" | "L" | "H";
  i: "N" | "L" | "H";
  a: "N" | "L" | "H";
};

export function calculateCvss(metrics: CvssMetrics) {
  const av = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[metrics.av];
  const ac = { L: 0.77, H: 0.44 }[metrics.ac];
  const pr = metrics.s === "U"
    ? { N: 0.85, L: 0.62, H: 0.27 }[metrics.pr]
    : { N: 0.85, L: 0.68, H: 0.5 }[metrics.pr];
  const ui = { N: 0.85, R: 0.62 }[metrics.ui];
  const impactValue = { N: 0, L: 0.22, H: 0.56 };
  const iss = 1 - (1 - impactValue[metrics.c]) * (1 - impactValue[metrics.i]) * (1 - impactValue[metrics.a]);
  const impact = metrics.s === "U"
    ? 6.42 * iss
    : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  const exploitability = 8.22 * av * ac * pr * ui;
  const raw = impact <= 0 ? 0 : metrics.s === "U"
    ? Math.min(impact + exploitability, 10)
    : Math.min(1.08 * (impact + exploitability), 10);
  const score = Math.ceil((raw - 1e-10) * 10) / 10;
  const severity = score === 0 ? "無" : score < 4 ? "低" : score < 7 ? "中" : score < 9 ? "高" : "嚴重";
  const vector = `CVSS:3.1/AV:${metrics.av}/AC:${metrics.ac}/PR:${metrics.pr}/UI:${metrics.ui}/S:${metrics.s}/C:${metrics.c}/I:${metrics.i}/A:${metrics.a}`;
  return { score, severity, vector };
}

export function estimatePassword(value: string) {
  let charset = 0;
  if (/[a-z]/.test(value)) charset += 26;
  if (/[A-Z]/.test(value)) charset += 26;
  if (/\d/.test(value)) charset += 10;
  if (/[^A-Za-z0-9]/.test(value)) charset += 33;
  let entropy = value.length && charset ? value.length * Math.log2(charset) : 0;
  const warnings: string[] = [];
  if (value.length < 14) warnings.push("長度少於 14 個字元");
  if (/^(.)\1+$/.test(value)) { entropy *= 0.15; warnings.push("大量重複字元"); }
  if (/(0123|1234|abcd|qwer|password|admin|letmein)/i.test(value)) { entropy *= 0.35; warnings.push("含常見序列或密碼字詞"); }
  if (!/[^A-Za-z0-9]/.test(value)) warnings.push("可加入符號提高搜尋空間");
  const level = entropy < 35 ? "弱" : entropy < 60 ? "普通" : entropy < 90 ? "強" : "非常強";
  return { entropy, level, warnings };
}

export function extractIocs(value: string) {
  const unique = (matches: string[]) => [...new Set(matches)].sort();
  const urls = value.match(/h(?:tt|xx)p(?:s)?(?::|\[:\])\/\/[a-z0-9][^\s<>"']+/gi) ?? [];
  const ips = (value.match(/\b(?:\d{1,3}\[?\.\]?){3}\d{1,3}\b/g) ?? [])
    .filter((candidate) => candidate.replace(/\[\.\]/g, ".").split(".").every((part) => Number(part) <= 255));
  const emails = value.match(/\b[A-Z0-9._%+-]+(?:@|\[@\])[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? [];
  const hashes = value.match(/\b(?:[a-f0-9]{64}|[a-f0-9]{40}|[a-f0-9]{32})\b/gi) ?? [];
  const domains = value.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\[?\.\]?)+(?:com|net|org|io|tw|cn|ru|co|info|biz|xyz|top|app|dev)\b/gi) ?? [];
  return { urls: unique(urls), ips: unique(ips), domains: unique(domains), emails: unique(emails), hashes: unique(hashes) };
}

export function defang(value: string) {
  return value.replace(/https/gi, "hxxps").replace(/http/gi, "hxxp").replace(/:/g, "[:]").replace(/\./g, "[.]").replace(/@/g, "[@]");
}

export function refang(value: string) {
  return value.replace(/hxxps/gi, "https").replace(/hxxp/gi, "http").replace(/\[:\]/g, ":").replace(/\[\.\]/g, ".").replace(/\[@\]/g, "@");
}

export function parseHeaderBlock(value: string) {
  assertSafeInput(value);
  const unfolded = value.replace(/\r?\n[\t ]+/g, " ");
  const headers = new Map<string, string[]>();
  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const headerValue = line.slice(separator + 1).trim();
    if (!name || !headerValue) continue;
    headers.set(name, [...(headers.get(name) ?? []), headerValue]);
  }
  return headers;
}

export type HeaderCheck = { name: string; status: "pass" | "warn" | "fail"; detail: string };

export function analyzeSecurityHeaders(value: string) {
  const headers = parseHeaderBlock(value);
  const one = (name: string) => headers.get(name)?.join(", ") ?? "";
  const csp = one("content-security-policy");
  const hsts = one("strict-transport-security");
  const referrer = one("referrer-policy").toLowerCase();
  const permissions = one("permissions-policy");
  const xfo = one("x-frame-options").toLowerCase();
  const checks: HeaderCheck[] = [];

  checks.push(!csp
    ? { name: "Content-Security-Policy", status: "fail", detail: "缺少 CSP，無法限制腳本、樣式與外部資源來源。" }
    : /'unsafe-eval'|\*|data:\s*;?/i.test(csp)
      ? { name: "Content-Security-Policy", status: "warn", detail: "已有 CSP，但包含寬鬆來源或 unsafe-eval，建議縮小允許範圍。" }
      : { name: "Content-Security-Policy", status: "pass", detail: "已設定 CSP，且未發現明顯的寬鬆腳本來源。" });

  const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0);
  checks.push(!hsts
    ? { name: "Strict-Transport-Security", status: "fail", detail: "缺少 HSTS，瀏覽器仍可能被降級到 HTTP。" }
    : maxAge < 31_536_000
      ? { name: "Strict-Transport-Security", status: "warn", detail: "HSTS max-age 少於一年，建議至少 31536000 秒。" }
      : { name: "Strict-Transport-Security", status: "pass", detail: "HSTS 有效期至少一年。" });

  checks.push(one("x-content-type-options").toLowerCase() === "nosniff"
    ? { name: "X-Content-Type-Options", status: "pass", detail: "已禁止 MIME sniffing。" }
    : { name: "X-Content-Type-Options", status: "fail", detail: "應設定為 nosniff。" });

  checks.push(["no-referrer", "strict-origin", "strict-origin-when-cross-origin", "same-origin"].includes(referrer)
    ? { name: "Referrer-Policy", status: "pass", detail: `目前策略：${referrer}。` }
    : referrer
      ? { name: "Referrer-Policy", status: "warn", detail: `目前策略 ${referrer} 可能透露較多 URL 資訊。` }
      : { name: "Referrer-Policy", status: "fail", detail: "缺少 Referrer-Policy。" });

  checks.push(permissions
    ? { name: "Permissions-Policy", status: "pass", detail: "已限制瀏覽器功能權限。" }
    : { name: "Permissions-Policy", status: "warn", detail: "建議明確關閉不使用的相機、麥克風、定位等權限。" });

  checks.push(/frame-ancestors/i.test(csp) || ["deny", "sameorigin"].includes(xfo)
    ? { name: "Clickjacking 防護", status: "pass", detail: "已透過 frame-ancestors 或 X-Frame-Options 限制嵌入。" }
    : { name: "Clickjacking 防護", status: "fail", detail: "缺少 frame-ancestors 與有效的 X-Frame-Options。" });

  checks.push(one("cross-origin-opener-policy").toLowerCase() === "same-origin"
    ? { name: "Cross-Origin-Opener-Policy", status: "pass", detail: "已隔離跨來源瀏覽內容。" }
    : { name: "Cross-Origin-Opener-Policy", status: "warn", detail: "高風險應用可考慮 same-origin。" });

  const points = checks.reduce((total, check) => total + (check.status === "pass" ? 2 : check.status === "warn" ? 1 : 0), 0);
  return { checks, score: Math.round((points / (checks.length * 2)) * 100), parsedCount: headers.size };
}

function addressDomain(value: string) {
  return value.match(/@([a-z0-9.-]+)/i)?.[1]?.toLowerCase() ?? "";
}

export function analyzeEmailHeaders(value: string) {
  const headers = parseHeaderBlock(value);
  const one = (name: string) => headers.get(name)?.[0] ?? "";
  const auth = [one("authentication-results"), one("received-spf"), ...(headers.get("arc-authentication-results") ?? [])].join("; ").toLowerCase();
  const status = (protocol: "spf" | "dkim" | "dmarc") => {
    if (new RegExp(`${protocol}\\s*=\\s*pass`).test(auth)) return "pass" as const;
    if (new RegExp(`${protocol}\\s*=\\s*(fail|softfail|temperror|permerror)`).test(auth)) return "fail" as const;
    return "unknown" as const;
  };
  const from = one("from");
  const replyTo = one("reply-to");
  const returnPath = one("return-path");
  const fromDomain = addressDomain(from);
  const replyDomain = addressDomain(replyTo);
  const returnDomain = addressDomain(returnPath);
  const warnings: string[] = [];
  if (replyDomain && fromDomain && replyDomain !== fromDomain) warnings.push(`Reply-To 網域 ${replyDomain} 與 From 網域 ${fromDomain} 不同。`);
  if (returnDomain && fromDomain && returnDomain !== fromDomain) warnings.push(`Return-Path 網域 ${returnDomain} 與 From 網域 ${fromDomain} 不同，需確認是否為合法寄信服務。`);
  if (status("dmarc") === "fail") warnings.push("DMARC 驗證失敗，寄件者可能遭冒用。");
  if (!one("message-id")) warnings.push("缺少 Message-ID。");
  return {
    summary: { from, replyTo, returnPath, subject: one("subject"), date: one("date"), messageId: one("message-id") },
    authentication: { spf: status("spf"), dkim: status("dkim"), dmarc: status("dmarc") },
    received: headers.get("received") ?? [],
    warnings,
    parsedCount: headers.size,
  };
}

type FileSignature = { label: string; mime: string; extensions: string[]; hex: number[] };

const fileSignatures: FileSignature[] = [
  { label: "PDF document", mime: "application/pdf", extensions: ["pdf"], hex: [0x25, 0x50, 0x44, 0x46] },
  { label: "PNG image", mime: "image/png", extensions: ["png"], hex: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { label: "JPEG image", mime: "image/jpeg", extensions: ["jpg", "jpeg"], hex: [0xff, 0xd8, 0xff] },
  { label: "GIF image", mime: "image/gif", extensions: ["gif"], hex: [0x47, 0x49, 0x46, 0x38] },
  { label: "ZIP / Office / JAR archive", mime: "application/zip", extensions: ["zip", "docx", "xlsx", "pptx", "jar", "apk"], hex: [0x50, 0x4b, 0x03, 0x04] },
  { label: "Windows PE executable", mime: "application/vnd.microsoft.portable-executable", extensions: ["exe", "dll", "sys"], hex: [0x4d, 0x5a] },
  { label: "ELF executable", mime: "application/x-elf", extensions: ["elf", "so", "bin"], hex: [0x7f, 0x45, 0x4c, 0x46] },
  { label: "GZIP archive", mime: "application/gzip", extensions: ["gz", "tgz"], hex: [0x1f, 0x8b] },
  { label: "7-Zip archive", mime: "application/x-7z-compressed", extensions: ["7z"], hex: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { label: "RAR archive", mime: "application/vnd.rar", extensions: ["rar"], hex: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { label: "SQLite database", mime: "application/vnd.sqlite3", extensions: ["sqlite", "sqlite3", "db"], hex: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66] },
];

export function identifyFileSignature(bytes: Uint8Array, filename = "") {
  const match = fileSignatures.find((signature) => signature.hex.every((byte, index) => bytes[index] === byte));
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  const hexPreview = Array.from(bytes.slice(0, 32), (byte) => byte.toString(16).padStart(2, "0")).join(" ");
  return {
    match: match ? { label: match.label, mime: match.mime, extensions: match.extensions } : null,
    extension,
    extensionMatches: match ? match.extensions.includes(extension) : null,
    hexPreview,
  };
}

export function extractPrintableStrings(bytes: Uint8Array, minimumLength = 4, limit = 2000) {
  const results: string[] = [];
  let current = "";
  for (const byte of bytes) {
    if (byte >= 0x20 && byte <= 0x7e) current += String.fromCharCode(byte);
    else {
      if (current.length >= minimumLength) results.push(current);
      current = "";
      if (results.length >= limit) break;
    }
  }
  if (current.length >= minimumLength && results.length < limit) results.push(current);
  return results;
}

export type TimestampFormat = "unix-seconds" | "unix-milliseconds" | "filetime" | "webkit";

export function decodeTimestamp(value: string, format: TimestampFormat) {
  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) throw new Error("時間戳必須是整數。 ");
  const raw = BigInt(normalized);
  let milliseconds: bigint;
  if (format === "unix-seconds") milliseconds = raw * BigInt(1000);
  else if (format === "unix-milliseconds") milliseconds = raw;
  else if (format === "filetime") milliseconds = raw / BigInt(10_000) - BigInt(11_644_473_600_000);
  else milliseconds = raw / BigInt(1000) - BigInt(11_644_473_600_000);
  const numeric = Number(milliseconds);
  const date = new Date(numeric);
  if (!Number.isFinite(numeric) || Number.isNaN(date.getTime())) throw new Error("時間戳超出可解析範圍。 ");
  return date;
}

export function scanSecrets(value: string) {
  assertSafeInput(value);
  const patterns = [
    { type: "Private Key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { type: "AWS Access Key", regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
    { type: "GitHub Token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,255}\b/g },
    { type: "JWT", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
    { type: "Slack Token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
    { type: "Google API Key", regex: /\bAIza[A-Za-z0-9_-]{30,}\b/g },
    { type: "Generic Secret Assignment", regex: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?([A-Za-z0-9_\-/.+=]{16,})["']?/gi },
  ];
  const findings: Array<{ type: string; line: number; preview: string }> = [];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern.regex)) {
      const raw = match[1] ?? match[0];
      const index = match.index ?? 0;
      const line = value.slice(0, index).split("\n").length;
      const preview = raw.length > 16 ? `${raw.slice(0, 7)}…${raw.slice(-4)}` : raw;
      findings.push({ type: pattern.type, line, preview });
    }
  }
  return findings.filter((finding, index) => findings.findIndex((item) => item.type === finding.type && item.line === finding.line && item.preview === finding.preview) === index);
}

export function identifyHash(value: string) {
  const hash = value.trim();
  const candidates: Array<{ name: string; confidence: "high" | "possible"; note: string }> = [];
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) candidates.push({ name: "bcrypt", confidence: "high", note: "Modular crypt format $2a/$2b/$2y" });
  if (/^\$argon2(?:id|i|d)\$/.test(hash)) candidates.push({ name: "Argon2", confidence: "high", note: "Argon2 encoded hash" });
  if (/^\$[156]\$/.test(hash)) candidates.push({ name: hash.startsWith("$1$") ? "md5crypt" : hash.startsWith("$5$") ? "sha256crypt" : "sha512crypt", confidence: "high", note: "Unix crypt format" });
  if (/^[a-f0-9]+$/i.test(hash)) {
    const byLength: Record<number, string[]> = { 32: ["MD5", "NTLM", "MD4"], 40: ["SHA-1", "RIPEMD-160"], 56: ["SHA-224"], 64: ["SHA-256", "BLAKE2s"], 96: ["SHA-384"], 128: ["SHA-512", "BLAKE2b"] };
    for (const name of byLength[hash.length] ?? []) candidates.push({ name, confidence: "possible", note: `${hash.length} 個十六進位字元，僅憑格式無法唯一確認` });
  }
  if (/^[A-F0-9]{16}:[A-F0-9]{32}$/i.test(hash)) candidates.push({ name: "LM:NTLM pair", confidence: "possible", note: "常見 Windows dump 格式" });
  return { candidates, length: hash.length, characterSet: /^[a-f0-9]+$/i.test(hash) ? "hexadecimal" : /^[A-Za-z0-9+/=]+$/.test(hash) ? "base64-like" : "mixed" };
}

export function formatHexView(bytes: Uint8Array, limit = 65_536) {
  const lines: string[] = [];
  const slice = bytes.slice(0, limit);
  for (let offset = 0; offset < slice.length; offset += 16) {
    const chunk = slice.slice(offset, offset + 16);
    const hex = Array.from(chunk, (byte) => byte.toString(16).padStart(2, "0")).join(" ").padEnd(47, " ");
    const ascii = Array.from(chunk, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
    lines.push(`${offset.toString(16).padStart(8, "0")}  ${hex}  |${ascii}|`);
  }
  return { text: lines.join("\n"), shownBytes: slice.length, truncated: bytes.length > limit };
}

export function analyzeUrlRisk(value: string) {
  const raw = value.trim();
  assertSafeInput(raw);
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  const flags: Array<{ level: "warn" | "danger"; label: string }> = [];
  if (url.username || url.password) flags.push({ level: "danger", label: "URL 內含帳號或密碼，可能用來混淆真正 Host。" });
  if (url.hostname.includes("xn--")) flags.push({ level: "warn", label: "Host 使用 Punycode，請確認是否為同形字攻擊。" });
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) flags.push({ level: "warn", label: "Host 直接使用 IP 位址。" });
  if (url.port && !["80", "443"].includes(url.port)) flags.push({ level: "warn", label: `使用非標準 Port ${url.port}。` });
  if (raw.length > 160) flags.push({ level: "warn", label: "URL 非常長，可能刻意隱藏重要片段。" });
  if ((raw.match(/%[0-9a-f]{2}/gi) ?? []).length >= 5) flags.push({ level: "warn", label: "包含大量百分比編碼。" });
  if (url.protocol !== "https:") flags.push({ level: "warn", label: `使用 ${url.protocol}，未受到 HTTPS 傳輸保護。` });
  return { normalized: url.href, protocol: url.protocol, hostname: url.hostname, port: url.port || "預設", pathname: url.pathname, queryCount: [...url.searchParams].length, fragment: url.hash || "—", flags };
}

export function calculateChmod(mode: string) {
  const normalized = mode.trim().replace(/^0/, "");
  if (!/^[0-7]{3,4}$/.test(normalized)) throw new Error("請輸入 3 或 4 位八進位權限，例如 755 或 4755。 ");
  const special = normalized.length === 4 ? Number(normalized[0]) : 0;
  const digits = normalized.length === 4 ? normalized.slice(1) : normalized;
  const triplets = digits.split("").map((digit) => {
    const value = Number(digit);
    return `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
  });
  if (special & 4) triplets[0] = `${triplets[0].slice(0, 2)}${triplets[0][2] === "x" ? "s" : "S"}`;
  if (special & 2) triplets[1] = `${triplets[1].slice(0, 2)}${triplets[1][2] === "x" ? "s" : "S"}`;
  if (special & 1) triplets[2] = `${triplets[2].slice(0, 2)}${triplets[2][2] === "x" ? "t" : "T"}`;
  const warnings: string[] = [];
  if (Number(digits[2]) & 2) warnings.push("Others 具有寫入權限（world-writable）。");
  if (special & 4) warnings.push("已設定 SUID，程式可能以擁有者權限執行。");
  if (special & 2) warnings.push("已設定 SGID，程式可能以群組權限執行。");
  return { symbolic: triplets.join(""), normalized: `${special ? special : ""}${digits}`, warnings };
}

export function hexToBytes(value: string) {
  const normalized = value.replace(/(?:0x|\s|:|-)/gi, "");
  if (!normalized || normalized.length % 2 || !/^[a-f0-9]+$/i.test(normalized)) throw new Error("Hex 必須包含偶數個十六進位字元。 ");
  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16));
}

export function xorTransform(input: string, key: string, inputHex = false, keyHex = false) {
  const data = inputHex ? hexToBytes(input) : new TextEncoder().encode(input);
  const keyBytes = keyHex ? hexToBytes(key) : new TextEncoder().encode(key);
  if (!keyBytes.length) throw new Error("Key 不可為空。 ");
  const output = data.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
  return { hex: Array.from(output, (byte) => byte.toString(16).padStart(2, "0")).join(""), text: new TextDecoder().decode(output) };
}

export function bruteForceSingleByteXor(value: string) {
  const bytes = hexToBytes(value);
  return Array.from({ length: 256 }, (_, key) => {
    const output = bytes.map((byte) => byte ^ key);
    const text = Array.from(output, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
    const score = Array.from(output).reduce((total, byte) => total + (byte === 32 ? 3 : /[ETAOINetaoin]/.test(String.fromCharCode(byte)) ? 2 : byte >= 32 && byte <= 126 ? 0.2 : -4), 0);
    return { key, hexKey: key.toString(16).padStart(2, "0"), text, score };
  }).sort((a, b) => b.score - a.score).slice(0, 12);
}

export function caesarBruteforce(value: string) {
  return Array.from({ length: 26 }, (_, shift) => ({ shift, text: value.replace(/[a-z]/gi, (character) => {
    const base = character <= "Z" ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base - shift + 26) % 26) + base);
  }) }));
}

export function convertNumberBase(value: string, fromBase: number, toBase: number) {
  if (![2, 8, 10, 16].includes(fromBase) || ![2, 8, 10, 16].includes(toBase)) throw new Error("不支援的進位。 ");
  const tokens = value.trim().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return "";
  const parsed = tokens.map((token) => {
    const clean = token.replace(/^0[xob]/i, "");
    let number = BigInt(0);
    for (const character of clean.toLowerCase()) {
      const digit = "0123456789abcdef".indexOf(character);
      if (digit < 0 || digit >= fromBase) throw new Error(`無法解析 ${token}。 `);
      number = number * BigInt(fromBase) + BigInt(digit);
    }
    return number;
  });
  if (toBase === 10) return parsed.map(String).join(" ");
  return parsed.map((number) => number.toString(toBase).toUpperCase()).join(" ");
}

export function asciiToNumbers(value: string, base: number) {
  return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(base).toUpperCase()).join(" ");
}

export function numbersToAscii(value: string, base: number) {
  const numbers = value.trim().split(/[\s,]+/).filter(Boolean).map((token) => parseInt(token.replace(/^0[xob]/i, ""), base));
  if (numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 255)) throw new Error("ASCII byte 必須介於 0 到 255。 ");
  return new TextDecoder().decode(Uint8Array.from(numbers));
}

export function packInteger(value: string, bits: 16 | 32 | 64, littleEndian: boolean) {
  const number = BigInt(value.trim());
  const max = (BigInt(1) << BigInt(bits)) - BigInt(1);
  if (number < BigInt(0) || number > max) throw new Error(`數值必須介於 0 與 ${max}。 `);
  const bytes = new Uint8Array(bits / 8);
  for (let index = 0; index < bytes.length; index += 1) bytes[littleEndian ? index : bytes.length - 1 - index] = Number((number >> BigInt(index * 8)) & BigInt(255));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

export function unpackInteger(value: string, littleEndian: boolean) {
  const bytes = hexToBytes(value);
  if (![2, 4, 8].includes(bytes.length)) throw new Error("請輸入 2、4 或 8 bytes。 ");
  let result = BigInt(0);
  for (let index = 0; index < bytes.length; index += 1) result |= BigInt(bytes[index]) << BigInt((littleEndian ? index : bytes.length - 1 - index) * 8);
  return result.toString();
}

export function gcdBigInt(a: bigint, b: bigint) {
  let left = a < 0 ? -a : a; let right = b < 0 ? -b : b;
  while (right) [left, right] = [right, left % right];
  return left;
}

export function modInverse(value: bigint, modulus: bigint) {
  let [oldR, r] = [value, modulus]; let [oldS, s] = [BigInt(1), BigInt(0)];
  while (r) { const q = oldR / r; [oldR, r] = [r, oldR - q * r]; [oldS, s] = [s, oldS - q * s]; }
  if (oldR !== BigInt(1) && oldR !== BigInt(-1)) throw new Error("模反元素不存在，兩數並非互質。 ");
  return ((oldS % modulus) + modulus) % modulus;
}

export function powMod(base: bigint, exponent: bigint, modulus: bigint) {
  if (modulus <= 0 || exponent < 0) throw new Error("Modulus 必須為正數，Exponent 不可為負。 ");
  let result = BigInt(1); let current = ((base % modulus) + modulus) % modulus; let power = exponent;
  while (power) { if (power & BigInt(1)) result = (result * current) % modulus; current = (current * current) % modulus; power >>= BigInt(1); }
  return result;
}

export type OtpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export function decodeBase32(value: string) {
  assertSafeInput(value);
  const normalized = value.toUpperCase().replace(/[\s-]+/g, "").replace(/=+$/, "");
  if (!normalized) throw new Error("Base32 Secret 不可為空。 ");
  if (!/^[A-Z2-7]+$/.test(normalized)) throw new Error("Base32 Secret 只能包含 A–Z 與 2–7。 ");
  if ([1, 3, 6].includes(normalized.length % 8)) throw new Error("Base32 Secret 長度不合法。 ");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let accumulator = 0;
  let bitCount = 0;
  for (const character of normalized) {
    accumulator = accumulator * 32 + alphabet.indexOf(character);
    bitCount += 5;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((accumulator >>> bitCount) & 0xff);
      accumulator &= (1 << bitCount) - 1;
    }
  }
  if (accumulator !== 0) throw new Error("Base32 Secret 的 padding bits 不合法。 ");
  return Uint8Array.from(bytes);
}

export async function generateHotp(secret: string, counter: bigint, digits: 6 | 7 | 8 = 6, algorithm: OtpAlgorithm = "SHA-1") {
  if (counter < 0 || counter > 0xffffffffffffffffn) throw new Error("HOTP Counter 必須介於 0 與 2⁶⁴−1。 ");
  const keyBytes = decodeBase32(secret);
  const counterBytes = new Uint8Array(8);
  let remaining = counter;
  for (let index = 7; index >= 0; index -= 1) {
    counterBytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3];
  return String(binary % (10 ** digits)).padStart(digits, "0");
}

export async function generateTotp(secret: string, unixSeconds = Math.floor(Date.now() / 1000), period = 30, digits: 6 | 7 | 8 = 6, algorithm: OtpAlgorithm = "SHA-1") {
  if (!Number.isSafeInteger(unixSeconds) || unixSeconds < 0) throw new Error("Unix 時間必須是非負整數。 ");
  if (!Number.isInteger(period) || period < 1 || period > 300) throw new Error("TOTP 週期必須介於 1 與 300 秒。 ");
  const counter = BigInt(Math.floor(unixSeconds / period));
  return {
    code: await generateHotp(secret, counter, digits, algorithm),
    counter,
    remainingSeconds: period - (unixSeconds % period),
  };
}

function parseIpv4Parts(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(?:0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new Error("請輸入有效的 IPv4 或 IPv6 位址。 ");
  }
  return parts.map(Number);
}

function parseIpv6Hextets(value: string) {
  const address = value.toLowerCase();
  if ((address.match(/::/g) ?? []).length > 1) throw new Error("IPv6 位址只能包含一個 ::。 ");
  const expandSide = (side: string) => side ? side.split(":").flatMap((part, index, all) => {
    if (part.includes(".")) {
      if (index !== all.length - 1) throw new Error("IPv4 尾端必須位於 IPv6 最後。 ");
      const ipv4 = parseIpv4Parts(part);
      return [(ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]];
    }
    if (!/^[a-f0-9]{1,4}$/.test(part)) throw new Error("IPv6 hextet 格式錯誤。 ");
    return [parseInt(part, 16)];
  }) : [];
  const [leftText, rightText = ""] = address.split("::");
  const left = expandSide(leftText);
  const right = expandSide(rightText);
  if (address.includes("::")) {
    const missing = 8 - left.length - right.length;
    if (missing < 1) throw new Error("IPv6 位址包含過多 hextet。 ");
    return [...left, ...Array(missing).fill(0), ...right];
  }
  if (left.length !== 8) throw new Error("IPv6 位址必須包含 8 個 hextet，或使用 :: 壓縮。 ");
  return left;
}

function compressIpv6(hextets: number[]) {
  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < hextets.length;) {
    if (hextets[index] !== 0) { index += 1; continue; }
    let end = index;
    while (end < hextets.length && hextets[end] === 0) end += 1;
    if (end - index > bestLength && end - index >= 2) { bestStart = index; bestLength = end - index; }
    index = end;
  }
  if (bestStart < 0) return hextets.map((part) => part.toString(16)).join(":");
  const left = hextets.slice(0, bestStart).map((part) => part.toString(16)).join(":");
  const right = hextets.slice(bestStart + bestLength).map((part) => part.toString(16)).join(":");
  return `${left}::${right}`;
}

export function analyzeIpAddress(value: string) {
  const raw = value.trim();
  const hasOpeningBracket = raw.startsWith("[");
  const hasClosingBracket = raw.endsWith("]");
  if (hasOpeningBracket !== hasClosingBracket) throw new Error("IPv6 方括號必須成對出現。 ");
  const input = hasOpeningBracket ? raw.slice(1, -1) : raw;
  assertSafeInput(input);
  if (!input || /%/.test(input)) throw new Error("請輸入不含 Zone ID 的 IPv4 或 IPv6 位址。 ");
  if (!input.includes(":")) {
    const parts = parseIpv4Parts(input);
    const integer = parts.reduce((total, part) => (total << 8n) | BigInt(part), 0n);
    const normalized = parts.join(".");
    return {
      version: 4 as const,
      normalized,
      expanded: normalized,
      decimal: integer.toString(),
      hexadecimal: `0x${integer.toString(16).padStart(8, "0")}`,
      binary: parts.map((part) => part.toString(2).padStart(8, "0")).join("."),
      reverseDns: `${[...parts].reverse().join(".")}.in-addr.arpa`,
    };
  }
  const hextets = parseIpv6Hextets(input);
  const fullHex = hextets.map((part) => part.toString(16).padStart(4, "0")).join("");
  const integer = BigInt(`0x${fullHex}`);
  return {
    version: 6 as const,
    normalized: compressIpv6(hextets),
    expanded: hextets.map((part) => part.toString(16).padStart(4, "0")).join(":"),
    decimal: integer.toString(),
    hexadecimal: `0x${fullHex}`,
    binary: hextets.map((part) => part.toString(2).padStart(16, "0")).join(":"),
    reverseDns: `${fullHex.split("").reverse().join(".")}.ip6.arpa`,
  };
}

export type EscapeFormat = "javascript" | "codepoints" | "html-numeric";

function codePointToCharacter(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
    throw new Error(`無效的 Unicode code point：${value.toString(16).toUpperCase()}。 `);
  }
  return String.fromCodePoint(value);
}

export function decodeEscapedText(value: string, format: EscapeFormat) {
  assertSafeInput(value);
  if (format === "codepoints") {
    const tokens = value.trim().split(/[\s,]+/).filter(Boolean);
    return tokens.map((token) => {
      const match = token.match(/^(?:U\+|0x)?([a-f0-9]{1,6})$/i);
      if (!match) throw new Error(`無法解析 code point：${token}。 `);
      return codePointToCharacter(parseInt(match[1], 16));
    }).join("");
  }
  if (format === "html-numeric") {
    return value.replace(/&#(x[a-f0-9]+|\d+);?/gi, (match, raw: string) => {
      const point = raw[0].toLowerCase() === "x" ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
      try { return codePointToCharacter(point); } catch { return match; }
    });
  }
  return value.replace(/\\u\{([a-f0-9]{1,6})\}|\\u([a-f0-9]{4})|\\x([a-f0-9]{2})|\\([0\\'"bfnrtv])/gi, (match, braced: string, unicode: string, hex: string, simple: string) => {
    if (braced) return codePointToCharacter(parseInt(braced, 16));
    if (unicode) return String.fromCharCode(parseInt(unicode, 16));
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    const escapes: Record<string, string> = { "0": "\0", "\\": "\\", "'": "'", "\"": "\"", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" };
    return escapes[simple] ?? match;
  });
}

export function encodeEscapedText(value: string, format: EscapeFormat) {
  assertSafeInput(value);
  if (format === "codepoints") return Array.from(value, (character) => `U+${character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
  if (format === "html-numeric") return Array.from(value, (character) => `&#x${character.codePointAt(0)?.toString(16).toUpperCase()};`).join("");
  return Array.from(value, (character) => {
    const point = character.codePointAt(0) ?? 0;
    const simple: Record<string, string> = { "\0": "\\0", "\\": "\\\\", "\"": "\\\"", "'": "\\'", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\v": "\\v" };
    if (simple[character]) return simple[character];
    if (point >= 0x20 && point <= 0x7e) return character;
    return point <= 0xffff ? `\\u${point.toString(16).toUpperCase().padStart(4, "0")}` : `\\u{${point.toString(16).toUpperCase()}}`;
  }).join("");
}

function bigintToIpv6(value: bigint) {
  const hextets = Array.from({ length: 8 }, (_, index) => Number((value >> BigInt((7 - index) * 16)) & 0xffffn));
  return {
    normalized: compressIpv6(hextets),
    expanded: hextets.map((part) => part.toString(16).padStart(4, "0")).join(":"),
  };
}

export function calculateIpv6Cidr(value: string) {
  const input = value.trim();
  assertSafeInput(input);
  const separator = input.lastIndexOf("/");
  if (separator <= 0) throw new Error("請輸入 IPv6 prefix，例如 2001:db8::1/64。 ");
  const rawAddress = input.slice(0, separator);
  const hasOpeningBracket = rawAddress.startsWith("[");
  const hasClosingBracket = rawAddress.endsWith("]");
  if (hasOpeningBracket !== hasClosingBracket) throw new Error("IPv6 位址的方括號不完整。 ");
  const addressText = hasOpeningBracket ? rawAddress.slice(1, -1) : rawAddress;
  const prefixText = input.slice(separator + 1);
  if (!/^\d{1,3}$/.test(prefixText)) throw new Error("IPv6 prefix length 必須是 0 到 128 的整數。 ");
  const prefix = Number(prefixText);
  if (prefix < 0 || prefix > 128) throw new Error("IPv6 prefix length 必須介於 0 到 128。 ");
  const hextets = parseIpv6Hextets(addressText);
  const address = BigInt(`0x${hextets.map((part) => part.toString(16).padStart(4, "0")).join("")}`);
  const allBits = (1n << 128n) - 1n;
  const hostBits = 128 - prefix;
  const hostMask = hostBits === 0 ? 0n : (1n << BigInt(hostBits)) - 1n;
  const networkValue = address & (allBits ^ hostMask);
  const lastValue = networkValue | hostMask;
  const network = bigintToIpv6(networkValue);
  const last = bigintToIpv6(lastValue);
  const fullHex = network.expanded.replace(/:/g, "");
  const reverseZone = prefix % 4 === 0
    ? `${fullHex.slice(0, prefix / 4).split("").reverse().join(".")}${prefix ? "." : ""}ip6.arpa`
    : null;
  return {
    prefix,
    network: `${network.normalized}/${prefix}`,
    expandedNetwork: `${network.expanded}/${prefix}`,
    firstAddress: network.normalized,
    lastAddress: last.normalized,
    addressCount: (1n << BigInt(hostBits)).toString(),
    reverseZone,
  };
}

export type HttpParameter = { name: string; value: string };

export function parseHttpMessage(value: string) {
  assertSafeInput(value);
  const normalized = value.replace(/\r\n/g, "\n");
  const boundary = normalized.indexOf("\n\n");
  const head = boundary >= 0 ? normalized.slice(0, boundary) : normalized;
  const body = boundary >= 0 ? normalized.slice(boundary + 2) : "";
  const rawLines = head.split("\n");
  const startLine = rawLines.shift()?.trim() ?? "";
  if (!startLine) throw new Error("缺少 HTTP Request／Response 起始行。 ");
  const requestMatch = startLine.match(/^([A-Z!#$%&'*+.^_`|~-]+)\s+(\S+)\s+(HTTP\/\d(?:\.\d)?)$/);
  const responseMatch = startLine.match(/^(HTTP\/\d(?:\.\d)?)\s+(\d{3})(?:\s+(.*))?$/);
  if (!requestMatch && !responseMatch) throw new Error("無法辨識 HTTP 起始行。 ");

  const lines: string[] = [];
  for (const line of rawLines) {
    if (/^[\t ]/.test(line) && lines.length) lines[lines.length - 1] += ` ${line.trim()}`;
    else lines.push(line);
  }
  const headers: Array<{ name: string; value: string }> = [];
  const headerMap = new Map<string, string[]>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) throw new Error(`無法解析 Header：${line.slice(0, 80)}。 `);
    const name = line.slice(0, colon).trim();
    const headerValue = line.slice(colon + 1).trim();
    headers.push({ name, value: headerValue });
    const lower = name.toLowerCase();
    headerMap.set(lower, [...(headerMap.get(lower) ?? []), headerValue]);
  }
  const values = (name: string) => headerMap.get(name) ?? [];
  const first = (name: string) => values(name)[0] ?? "";
  const warnings: string[] = [];
  const contentLengths = values("content-length");
  const actualBodyBytes = new TextEncoder().encode(body).length;
  if (contentLengths.length > 1 && new Set(contentLengths).size > 1) warnings.push("存在互相衝突的 Content-Length，可能造成 HTTP parsing ambiguity。");
  if (contentLengths.length && !contentLengths.every((item) => /^\d+$/.test(item))) warnings.push("Content-Length 不是有效的非負整數。");
  else if (contentLengths.length && Number(contentLengths[0]) !== actualBodyBytes) warnings.push(`Content-Length 為 ${contentLengths[0]}，實際 Body 是 ${actualBodyBytes} bytes。`);
  if (contentLengths.length && values("transfer-encoding").length) warnings.push("同時出現 Content-Length 與 Transfer-Encoding，需檢查 Request Smuggling 風險。");
  if (values("authorization").length) warnings.push("包含 Authorization credential，分享前請先遮罩。");
  if (values("cookie").length || values("set-cookie").length) warnings.push("包含 Cookie，可能含有 Session 或追蹤識別資訊。");

  let method = "";
  let target = "";
  let version = "";
  let status = "";
  let reason = "";
  const query: HttpParameter[] = [];
  if (requestMatch) {
    [, method, target, version] = requestMatch;
    if (version === "HTTP/1.1" && !first("host") && !/^https?:\/\//i.test(target)) warnings.push("HTTP/1.1 Request 缺少 Host Header。");
    try {
      const url = new URL(target, "https://placeholder.invalid");
      for (const [name, parameterValue] of url.searchParams) query.push({ name, value: parameterValue });
    } catch { warnings.push("Request target 不是可解析的 URL／Path。"); }
  } else if (responseMatch) {
    [, version, status, reason = ""] = responseMatch;
  }
  const cookies: HttpParameter[] = [];
  for (const cookieHeader of values("cookie")) {
    for (const item of cookieHeader.split(";")) {
      const equals = item.indexOf("=");
      cookies.push({ name: (equals >= 0 ? item.slice(0, equals) : item).trim(), value: equals >= 0 ? item.slice(equals + 1).trim() : "" });
    }
  }
  for (const setCookie of values("set-cookie")) {
    const pair = setCookie.split(";", 1)[0];
    const equals = pair.indexOf("=");
    cookies.push({ name: (equals >= 0 ? pair.slice(0, equals) : pair).trim(), value: equals >= 0 ? pair.slice(equals + 1).trim() : "" });
  }
  const bodyParameters: HttpParameter[] = [];
  if (/application\/x-www-form-urlencoded/i.test(first("content-type"))) {
    for (const [name, parameterValue] of new URLSearchParams(body)) bodyParameters.push({ name, value: parameterValue });
  }
  let json: unknown = null;
  let jsonValid: boolean | null = null;
  if (/application\/(?:[\w.+-]+\+)?json/i.test(first("content-type")) && body.trim()) {
    try { json = JSON.parse(body); jsonValid = true; }
    catch { jsonValid = false; warnings.push("Content-Type 是 JSON，但 Body 無法解析為有效 JSON。"); }
  }
  return {
    type: requestMatch ? "request" as const : "response" as const,
    startLine,
    method,
    target,
    version,
    status,
    statusCode: status ? Number(status) : null,
    reason,
    headers,
    query,
    cookies,
    body,
    bodyBytes: actualBodyBytes,
    bodyParameters,
    json,
    jsonValid,
    warnings,
  };
}

export type DecodingLayer = { format: string; beforeLength: number; afterLength: number; preview: string };

export function decodeLayered(value: string, maxLayers = 8) {
  assertSafeInput(value);
  if (!Number.isInteger(maxLayers) || maxLayers < 1 || maxLayers > 12) throw new Error("最多解碼層數必須介於 1 到 12。 ");
  let current = value.trim();
  const seen = new Set([current]);
  const steps: DecodingLayer[] = [];
  for (let index = 0; index < maxLayers; index += 1) {
    const candidates: Array<{ format: string; decode: () => string | null }> = [
      { format: "URL percent encoding", decode: () => /%[a-f0-9]{2}/i.test(current) ? decodeURIComponent(current) : null },
      { format: "JavaScript escape", decode: () => /\\(?:u\{[a-f0-9]{1,6}\}|u[a-f0-9]{4}|x[a-f0-9]{2})/i.test(current) ? decodeEscapedText(current, "javascript") : null },
      { format: "HTML numeric entity", decode: () => /&#(?:x[a-f0-9]+|\d+);?/i.test(current) ? decodeEscapedText(current, "html-numeric") : null },
      { format: "Hex UTF-8", decode: () => {
        const compact = current.replace(/[\s:-]/g, "").replace(/^0x/i, "");
        if (compact.length < 4 || compact.length % 2 || !/^[a-f0-9]+$/i.test(compact)) return null;
        try { return new TextDecoder("utf-8", { fatal: true }).decode(hexToBytes(compact)); } catch { return null; }
      } },
      { format: "Base64 UTF-8", decode: () => {
        const compact = current.replace(/\s/g, "");
        if (compact.length < 8 || compact.length % 4 === 1 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) return null;
        const standard = compact.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(compact.length / 4) * 4, "=");
        try { return base64ToUtf8(standard); } catch { return null; }
      } },
    ];
    let decoded: { format: string; output: string } | null = null;
    for (const candidate of candidates) {
      try {
        const output = candidate.decode();
        if (output !== null && output !== current) { decoded = { format: candidate.format, output }; break; }
      } catch { /* 該格式不成立時交給下一個安全 decoder */ }
    }
    if (!decoded || seen.has(decoded.output)) break;
    assertSafeInput(decoded.output);
    steps.push({ format: decoded.format, beforeLength: current.length, afterLength: decoded.output.length, preview: decoded.output.slice(0, 320) });
    current = decoded.output;
    seen.add(current);
  }
  return { final: current, steps, reachedLimit: steps.length === maxLayers };
}

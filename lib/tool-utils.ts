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

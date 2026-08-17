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

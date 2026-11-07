// Guess which tools fit a pasted value or dropped file, so visitors don't need to know tool names.
// Pure heuristics on the input itself; nothing is sent anywhere.

export type Suggestion = { slug: string; score: number; reason: { zh: string; en: string }; action?: string };

/** The button (by its Chinese label) that runs each tool after the input is filled in. Tools that update live need none. */
export const toolActions: Record<string, string> = {
  "jwt-decoder": "安全解碼", "jwt-forger": "載入 Header／Payload", "base64-codec": "解碼", "hash-generator": "計算雜湊", "url-risk-analyzer": "拆解 URL",
  "url-defanger": "Defang", "cidr-calculator": "計算網段", "ip-address-converter": "解析與轉換", "ipv6-cidr-calculator": "計算 IPv6 網段",
  "ipv4-cidr-aggregator": "合併 CIDR 清單", "timestamp-decoder": "解碼時間", "email-header-analyzer": "分析郵件標頭", "http-message-parser": "解析 HTTP 訊息",
  "security-headers-analyzer": "分析安全標頭", "csp-policy-analyzer": "深度分析 CSP", "layered-decoder": "自動逐層解碼", "path-traversal-analyzer": "分析 Path Traversal",
  "url-codec": "解碼", "unicode-escape-codec": "解碼", "morse-code": "解碼摩斯碼", "brainfuck-interpreter": "執行", "base-family-codec": "自動辨識",
  "compression-codec": "解壓縮", "pickle-analyzer": "靜態分析", "php-unserialize": "解析資料", "ioc-extractor": "擷取 IOC", "vigenere-cipher": "自動破解 Key",
};

/** Tools whose first text field isn't where a pasted value belongs; visitors are sent there without prefilling. */
export const noPrefill = new Set(["rsa-solver", "rsa-math-helper", "cvss-calculator", "otp-generator", "password-generator"]);

const reason = (zh: string, en: string) => ({ zh, en });

function decodeBase64(value: string) {
  const cleaned = value.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (cleaned.length < 8 || cleaned.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  try {
    const binary = atob(cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch { return null; }
}

function printableRatio(bytes: Uint8Array) {
  if (!bytes.length) return 0;
  let printable = 0;
  for (const byte of bytes) if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127) || byte >= 0xc2) printable += 1;
  return printable / bytes.length;
}

function lettersOnlyRatio(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, "").length;
  return value.replace(/\s/g, "").length ? letters / value.replace(/\s/g, "").length : 0;
}

/** Rank tools for a pasted value. Higher scores first; at most `limit` results. */
export function detectInput(input: string, limit = 5): Suggestion[] {
  const value = input.trim();
  if (!value) return [];
  const found = new Map<string, Suggestion>();
  const add = (slug: string, score: number, why: { zh: string; en: string }, action = toolActions[slug]) => {
    const current = found.get(slug);
    if (!current || current.score < score) found.set(slug, { slug, score, reason: why, ...(action ? { action } : {}) });
  };
  const singleLine = !/\n/.test(value);
  const compact = value.replace(/\s/g, "");

  // Structured formats with unmistakable shapes.
  if (/^eyJ[\w-]*\.eyJ[\w-]*\.[\w-]*$/.test(compact)) {
    add("jwt-decoder", 100, reason("JWT（三段 Base64URL，以 eyJ 開頭）", "A JWT (three Base64URL parts starting with eyJ)"));
    add("jwt-signature-verifier", 70, reason("可驗證這個 JWT 的簽章", "Verify this JWT's signature"));
    add("jwt-forger", 40, reason("修改 payload 後重新簽章（授權測試）", "Re-sign a modified payload (authorized testing)"));
  }
  if (/^CVSS:3\.[01]\//.test(value)) add("cvss-calculator", 100, reason("CVSS v3 向量字串", "A CVSS v3 vector string"));
  if (/^otpauth:\/\//i.test(value)) add("otp-generator", 100, reason("otpauth:// 兩步驟驗證 URI", "An otpauth:// two-factor URI"));
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bsk_live_[A-Za-z0-9]{16,}/.test(value)) {
    add("secret-scanner", 98, reason("內容裡疑似有金鑰或 Token", "Looks like it contains keys or tokens"));
  }
  if (/^(?:Received|Return-Path|Authentication-Results|DKIM-Signature|Message-ID|X-Mailer):/im.test(value) && /^(?:From|Subject|Date):/im.test(value)) {
    add("email-header-analyzer", 97, reason("Email 郵件標頭", "Email headers"));
  }
  if (/^(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) \S+ HTTP\/[\d.]+/m.test(value) || /^HTTP\/[\d.]+ \d{3}/.test(value)) {
    add("http-message-parser", 92, reason("HTTP 請求或回應", "An HTTP request or response"));
    if (/^(?:strict-transport-security|content-security-policy|x-frame-options|x-content-type-options):/im.test(value)) add("security-headers-analyzer", 90, reason("含有安全相關回應標頭", "Contains security response headers"));
  }
  if (/(?:^|;\s*)(?:default-src|script-src|style-src|object-src|frame-ancestors)\s/i.test(value) && singleLine) add("csp-policy-analyzer", 95, reason("Content-Security-Policy 政策", "A Content-Security-Policy"));
  if (/^(?:strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy):/im.test(value)) add("security-headers-analyzer", 88, reason("HTTP 安全標頭", "HTTP security headers"));
  if (/^[aOCs]:\d+:/.test(value) || /^[aO]%3A\d+%3A/i.test(value)) add("php-unserialize", 96, reason("PHP serialize() 資料", "PHP serialize() data"));
  if (/\bn\s*[=:]\s*(?:0x)?\d{20,}/i.test(value) && /\be\s*[=:]\s*\d+/i.test(value)) {
    add("rsa-solver", 97, reason("RSA 參數（n、e、c）", "RSA parameters (n, e, c)"));
    add("rsa-math-helper", 50, reason("RSA 相關數論計算", "RSA number theory"));
  }

  // URLs, network values and IOCs.
  const urlLike = /^(?:h[tx]{2}ps?|ftp)(?::|\[:\])\/\//i.test(value) && singleLine;
  if (urlLike) {
    if (/^hxxp|\[\.\]|\[:\]/i.test(value)) add("url-defanger", 96, reason("已 defang 的網址，可還原", "A defanged URL you can refang"), "Refang");
    add("url-risk-analyzer", 94, reason("網址：檢查釣魚與混淆手法", "A URL: check for phishing tricks"));
    add("url-defanger", 70, reason("分享前先 defang 網址", "Defang it before sharing"));
    if (/%2e%2e|\.\.[/\\]|%252e/i.test(value)) add("path-traversal-analyzer", 90, reason("網址含有 ../ 路徑穿越片段", "The URL contains ../ traversal"));
    if (/%[0-9a-f]{2}/i.test(value)) add("url-codec", 55, reason("含有 URL 編碼", "Contains URL encoding"));
  }
  const ipv4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  if (ipv4.test(value)) add("ip-address-converter", 95, reason("IPv4 位址", "An IPv4 address"));
  if (/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(value)) add("cidr-calculator", 98, reason("IPv4 CIDR 網段", "An IPv4 CIDR block"));
  const cidrLines = value.split(/[\s,]+/).filter((token) => /^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(token));
  if (cidrLines.length >= 2 && cidrLines.length === value.split(/[\s,]+/).filter(Boolean).length) add("ipv4-cidr-aggregator", 96, reason("多個 IPv4 位址或網段，可合併", "Several IPv4 addresses or blocks to merge"));
  if (singleLine && /^[0-9a-f:]+(?:\/\d{1,3})?$/i.test(value) && value.includes("::") || /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}(?:\/\d{1,3})?$/i.test(value)) {
    add(value.includes("/") ? "ipv6-cidr-calculator" : "ip-address-converter", 95, reason("IPv6 位址", "An IPv6 address"));
    add("ipv6-cidr-calculator", 80, reason("IPv6 網段計算", "IPv6 prefix math"));
  }
  if (/\s/.test(value)) {
    const iocCount = (value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[a-f0-9]{32,64}\b|h[tx]{2}ps?:\/\/|\b[\w-]+(?:\.|\[\.\])(?:com|net|org|io|ru|cn|xyz|top|info)\b/gi) ?? []).length;
    if (iocCount >= 2) add("ioc-extractor", 85, reason(`文字中有 ${iocCount} 個 IP、網址或雜湊等 IOC`, `${iocCount} IPs, URLs or hashes in the text`));
  }

  // Hashes and numbers.
  if (/^\$(?:2[abxy]|argon2(?:id|i|d)|[156y]|apr1)\$/.test(value) && singleLine) add("hash-identifier", 98, reason("密碼雜湊（bcrypt／argon2／crypt）", "A password hash (bcrypt/argon2/crypt)"));
  if (/^[a-f0-9]+$/i.test(value)) {
    const hashLengths: Record<number, string> = { 32: "MD5／NTLM", 40: "SHA-1", 56: "SHA-224", 64: "SHA-256", 96: "SHA-384", 128: "SHA-512" };
    if (hashLengths[value.length]) add("hash-identifier", 93, reason(`${value.length} 個十六進位字元，可能是 ${hashLengths[value.length]} 雜湊`, `${value.length} hex characters — possibly a ${hashLengths[value.length]} hash`));
  }
  if (/^\d{9,10}(?:\.\d+)?$|^\d{13}$|^\d{16,18}$/.test(value)) add("timestamp-decoder", 90, reason("看起來是 Unix／FILETIME 時間戳", "Looks like a Unix or FILETIME timestamp"));
  if (/^[0-7]{3,4}$/.test(value) || /^[-dl]?(?:[r-][w-][xsS-]){2}[r-][w-][xtT-]$/.test(value)) add("chmod-calculator", 94, reason("Unix 權限（八進位或 rwx）", "Unix permissions (octal or rwx)"));
  if (/^\d{15,}$/.test(value) && !found.has("timestamp-decoder")) add("rsa-math-helper", 45, reason("很大的整數", "A very large integer"));

  // Encodings.
  if (/^[01\s]+$/.test(value) && compact.length >= 16 && compact.length % 8 === 0) add("base-ascii-converter", 93, reason("二進位 0／1，可轉成 ASCII", "Binary 0/1 you can turn into ASCII"), "");
  if (/^(?:[0-9a-f]{2}[\s:]?)+$/i.test(value) && compact.replace(/:/g, "").length % 2 === 0 && compact.length >= 8 && !/^\d+$/.test(compact) && !found.has("hash-identifier") && !found.has("base-ascii-converter")) {
    const bytes = Uint8Array.from(compact.replace(/:/g, "").match(/../g)!, (pair) => parseInt(pair, 16));
    const readable = printableRatio(bytes) > 0.9;
    add("base-ascii-converter", readable ? 90 : 70, reason(readable ? "Hex 編碼的可讀文字" : "Hex 資料", readable ? "Hex-encoded readable text" : "Hex data"), "數值 → ASCII");
    add("layered-decoder", 72, reason("嘗試逐層解碼", "Try decoding layer by layer"));
    if (!readable) add("xor-tool", 68, reason("Hex 資料解出亂碼時，常是 XOR 加密", "Garbled hex is often XOR-encrypted"));
    if (/^(?:1f8b|78(?:01|5e|9c|da))/i.test(compact)) add("compression-codec", 92, reason("gzip／zlib 壓縮資料（Hex）", "gzip/zlib compressed data (hex)"));
  }
  if (/%[0-9a-f]{2}/i.test(value) && !urlLike) {
    add("url-codec", 85, reason("URL 編碼（%XX）", "URL encoding (%XX)"));
    add("layered-decoder", 80, reason("可能包了多層編碼", "May hide several encoding layers"));
    if (/%2e%2e|%252e|\.\.%2f|\.\.\//i.test(value)) add("path-traversal-analyzer", 92, reason("含有編碼過的 ../ 路徑穿越", "Contains encoded ../ traversal"));
  }
  if (/\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|&#x?[0-9a-f]+;/i.test(value)) add("unicode-escape-codec", 90, reason("Unicode／HTML 跳脫序列", "Unicode or HTML escapes"));
  if (/^[.\-\s/|]+$/.test(value) && /[.-]{2}/.test(value) && /\s/.test(value)) add("morse-code", 96, reason("由 . 和 - 組成的摩斯密碼", "Morse code made of dots and dashes"));
  if (/^[+\-<>[\].,\s]+$/.test(value) && compact.length >= 10 && /[[\]]/.test(value)) add("brainfuck-interpreter", 96, reason("Brainfuck 程式", "A Brainfuck program"));
  if (/^(?:Ook[.!?]\s*){4,}$/.test(value)) add("brainfuck-interpreter", 96, reason("Ook! 程式", "An Ook! program"));
  if (/^[AB\s]+$/.test(value) && compact.length >= 10 && compact.length % 5 === 0) add("classic-ciphers", 90, reason("A／B 組成，可能是培根密碼", "A/B groups — likely a Bacon cipher"));
  if (/^[A-Z2-7]+=*$/.test(compact) && compact.length >= 16 && compact.length % 8 === 0) {
    add("base-family-codec", 88, reason("只有 A–Z 與 2–7，可能是 Base32", "Only A–Z and 2–7 — possibly Base32"));
    add("otp-generator", 55, reason("Base32 也是 TOTP Secret 的格式", "Base32 is also the TOTP secret format"));
  }

  const base64 = decodeBase64(value);
  if (base64 && !/ /.test(value) && !found.has("jwt-decoder") && !/^\d+$/.test(compact) && !(/^[a-f0-9]+$/i.test(compact) && compact.length % 2 === 0)) {
    const head = Array.from(base64.subarray(0, 4), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (head.startsWith("1f8b") || /^78(?:01|5e|9c|da)/.test(head)) add("compression-codec", 97, reason("Base64 包著 gzip／zlib 壓縮資料", "Base64-wrapped gzip/zlib data"));
    else if (head.startsWith("80") && base64.length > 4 && base64[base64.length - 1] === 0x2e) add("pickle-analyzer", 97, reason("Base64 包著 Python pickle", "Base64-wrapped Python pickle"));
    else if (head.startsWith("504b0304")) add("zip-inspector", 80, reason("Base64 包著 ZIP 檔", "Base64-wrapped ZIP file"));
    const readable = printableRatio(base64) > 0.92;
    add("base64-codec", readable ? 91 : 75, reason(readable ? "Base64 編碼的文字" : "Base64 編碼的二進位資料", readable ? "Base64-encoded text" : "Base64-encoded binary data"));
    add("layered-decoder", 78, reason("解開後可能還有下一層", "There may be another layer inside"));
    if (!readable) add("recipe-chain", 70, reason("用 Recipe 串接解碼、XOR、解壓縮", "Chain decode, XOR and decompress steps"));
  } else if (/^[1-9A-HJ-NP-Za-km-z]{20,}$/.test(compact) && !/[0OIl]/.test(compact)) {
    add("base-family-codec", 70, reason("沒有 0、O、I、l，可能是 Base58", "No 0, O, I or l — possibly Base58"));
  }

  // Classical ciphers: mostly letters, reads like gibberish, maybe with a flag-shaped tail.
  const strong = [...found.values()].some((item) => item.score >= 90);
  const plainEnglish = (value.toLowerCase().match(/\b(?:the|and|is|are|this|that|with|for|you|of|to|in)\b/g) ?? []).length >= 2;
  if (plainEnglish && !strong) {
    add("hash-generator", 62, reason("一般文字：計算雜湊值", "Plain text: hash it"));
    add("base64-codec", 60, reason("一般文字：編碼成 Base64", "Plain text: encode it as Base64"));
  }
  if (/^[A-Za-z0-9\s.,'!?{}_:;-]+$/.test(value) && lettersOnlyRatio(value) > 0.6 && compact.length >= 6 && !strong && !plainEnglish) {
    const flagLike = /^[a-z]{2,8}\{[^}]+\}$/i.test(compact);
    add("caesar-bruteforce", flagLike ? 92 : 80, reason(flagLike ? "像 flag 但字母被替換過，先試 ROT／Caesar" : "只有字母的密文，先試 Caesar 位移", flagLike ? "Flag-shaped but scrambled — try ROT/Caesar first" : "Letters-only ciphertext — try Caesar shifts first"));
    add("vigenere-cipher", 72, reason("位移不行就試 Vigenère 自動破解", "If shifts fail, try cracking Vigenère"));
    add("frequency-analysis", 70, reason("字母頻率可判斷是哪一類密碼", "Letter frequencies reveal the cipher type"));
    add("classic-ciphers", 60, reason("Atbash、Affine、柵欄等古典密碼", "Atbash, Affine, Rail Fence and more"));
  }

  // Short single-line values that are none of the above might be a password to check.
  if (!found.size && singleLine && value.length >= 6 && value.length <= 64 && !/\s/.test(value)) {
    add("password-strength", 50, reason("單一字串，可檢查密碼強度", "A single string — check its password strength"));
    add("hash-generator", 45, reason("計算這段文字的雜湊值", "Hash this text"));
  }
  if (!found.size) {
    add("layered-decoder", 40, reason("不確定格式時，先自動嘗試常見編碼", "Not sure? Try common encodings automatically"));
    add("recipe-chain", 35, reason("自己串接多個解碼步驟", "Chain decoding steps yourself"));
    add("entropy-calculator", 30, reason("用熵值判斷是否為加密或壓縮資料", "Use entropy to spot encrypted or compressed data"));
  }
  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Rank tools for a dropped file using its magic bytes and name. */
export function detectFile(bytes: Uint8Array, name = "", limit = 5): Suggestion[] {
  const head = Array.from(bytes.subarray(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const ascii = new TextDecoder("latin1").decode(bytes.subarray(0, 12));
  const extension = name.toLowerCase().split(".").pop() ?? "";
  const list: Suggestion[] = [];
  const add = (slug: string, score: number, zh: string, en: string) => list.push({ slug, score, reason: reason(zh, en) });
  if (head.startsWith("89504e47")) {
    add("png-crc-fixer", 90, "PNG 圖片：檢查 CRC 與被改過的寬高", "PNG image: check CRCs and tampered dimensions");
    add("lsb-steganography", 88, "檢查 LSB 位元平面隱寫", "Check LSB bit-plane steganography");
    add("hidden-data-scanner", 85, "掃描結尾後夾帶的檔案", "Scan for appended files");
    add("exif-viewer", 75, "讀取 EXIF 與文字區塊", "Read EXIF and text chunks");
    add("qr-code-decoder", 60, "如果是 QR Code 就解碼", "Decode it if it's a QR code");
  } else if (head.startsWith("ffd8ff")) {
    add("exif-viewer", 95, "JPEG 照片：檢查 EXIF 與 GPS 位置", "JPEG photo: check EXIF and GPS location");
    add("hidden-data-scanner", 85, "掃描結尾後夾帶的檔案", "Scan for appended files");
    add("qr-code-decoder", 60, "如果是 QR Code 就解碼", "Decode it if it's a QR code");
  } else if (ascii.startsWith("GIF8") || head.startsWith("424d") || (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")) {
    add("exif-viewer", 80, "圖片：讀取中繼資料", "Image: read its metadata");
    add("lsb-steganography", 78, "檢查 LSB 位元平面隱寫", "Check LSB bit-plane steganography");
    add("hidden-data-scanner", 75, "掃描夾帶的檔案", "Scan for embedded files");
  } else if (head.startsWith("504b0304") || head.startsWith("504b0506")) {
    add("zip-inspector", 96, "ZIP 壓縮檔：檢查偽加密、註解與內容", "ZIP archive: check pseudo-encryption, comments and contents");
    add("hidden-data-scanner", 60, "掃描夾帶的其他檔案", "Scan for other embedded files");
  } else if (head.startsWith("1f8b")) {
    add("compression-codec", 96, "gzip 壓縮檔：直接解壓縮", "gzip file: decompress it");
  } else if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE" || ascii.startsWith("ID3") || head.startsWith("fffb") || head.startsWith("fff3") || ascii.startsWith("OggS") || ascii.startsWith("fLaC") || ["wav", "mp3", "ogg", "flac", "m4a"].includes(extension)) {
    add("audio-spectrogram", 96, "音訊檔：看頻譜圖與 DTMF 撥號音", "Audio: view the spectrogram and DTMF tones");
  } else if (["d4c3b2a1", "a1b2c3d4", "4d3cb2a1", "a1b23c4d"].some((magic) => head.startsWith(magic))) {
    add("pcap-summary-analyzer", 96, "PCAP 封包擷取檔", "A PCAP packet capture");
  } else if (head.startsWith("80") && ["pkl", "pickle", "pt", "pth", "joblib", "bin"].includes(extension) || /^800[2-5]/.test(head)) {
    add("pickle-analyzer", 95, "Python pickle：載入前先檢查危險匯入", "Python pickle: check for dangerous imports before loading");
  }
  add("file-signature-checker", 55, "確認副檔名與實際檔案類型是否一致", "Check the extension matches the real file type");
  add("hidden-data-scanner", 50, "像 binwalk 一樣掃描內嵌檔案", "Scan for embedded files like binwalk");
  add("string-extractor", 45, "擷取可讀字串", "Extract readable strings");
  add("hex-viewer", 40, "以 Hex 檢視內容", "View it in hex");
  const seen = new Set<string>();
  return list.sort((a, b) => b.score - a.score).filter((item) => !seen.has(item.slug) && seen.add(item.slug)).slice(0, limit);
}

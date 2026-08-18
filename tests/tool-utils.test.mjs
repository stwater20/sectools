import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeEmailHeaders,
  analyzeIpAddress,
  analyzeSecurityHeaders,
  analyzeUrlRisk,
  asciiToNumbers,
  base64ToUtf8,
  calculateCidr,
  calculateChmod,
  bruteForceSingleByteXor,
  caesarBruteforce,
  convertNumberBase,
  calculateCvss,
  calculateEntropy,
  decodeTimestamp,
  decodeEscapedText,
  defang,
  extractIocs,
  extractPrintableStrings,
  encodeEscapedText,
  formatHexView,
  identifyHash,
  identifyFileSignature,
  refang,
  scanSecrets,
  packInteger,
  unpackInteger,
  xorTransform,
  gcdBigInt,
  generateHotp,
  generateTotp,
  modInverse,
  powMod,
  utf8ToBase64,
} from "../lib/tool-utils.ts";

test("Base64 round-trips UTF-8 text", () => {
  const source = "資安工具 ✓";
  assert.equal(base64ToUtf8(utf8ToBase64(source)), source);
});

test("CIDR calculator returns the correct /24 range", () => {
  assert.deepEqual(calculateCidr("192.168.10.42/24"), {
    network: "192.168.10.0",
    broadcast: "192.168.10.255",
    subnetMask: "255.255.255.0",
    firstHost: "192.168.10.1",
    lastHost: "192.168.10.254",
    totalAddresses: "256",
    usableHosts: "254",
  });
});

test("CVSS v3.1 example calculates a critical 9.8", () => {
  const result = calculateCvss({ av: "N", ac: "L", pr: "N", ui: "N", s: "U", c: "H", i: "H", a: "H" });
  assert.equal(result.score, 9.8);
  assert.equal(result.severity, "嚴重");
  assert.equal(result.vector, "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
});

test("entropy identifies a uniform string", () => {
  assert.deepEqual(calculateEntropy("aaaa"), { bitsPerSymbol: 0, totalBits: 0, uniqueSymbols: 1 });
});

test("defang and refang are reversible for a URL", () => {
  const url = "https://bad.example/path";
  assert.equal(refang(defang(url)), url);
});

test("IOC extraction de-duplicates common indicators", () => {
  const result = extractIocs("8.8.8.8 8.8.8.8 bad.com https://bad.com/a 44d88612fea8a8f36de82e1278abb02f");
  assert.deepEqual(result.ips, ["8.8.8.8"]);
  assert.ok(result.domains.includes("bad.com"));
  assert.equal(result.hashes.length, 1);
});

test("security header analyzer rewards a hardened policy", () => {
  const result = analyzeSecurityHeaders([
    "Content-Security-Policy: default-src 'self'; frame-ancestors 'none'",
    "Strict-Transport-Security: max-age=63072000; includeSubDomains",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy: camera=(), microphone=()",
    "Cross-Origin-Opener-Policy: same-origin",
  ].join("\n"));
  assert.equal(result.score, 100);
  assert.ok(result.checks.every((check) => check.status === "pass"));
});

test("email header analyzer detects authentication and domain mismatch", () => {
  const result = analyzeEmailHeaders([
    "From: Security <alert@example.com>",
    "Reply-To: attacker@evil.com",
    "Return-Path: <bounce@example.com>",
    "Message-ID: <123@example.com>",
    "Authentication-Results: mx.example; spf=pass; dkim=pass; dmarc=fail",
    "Received: from relay.example by mx.example",
  ].join("\n"));
  assert.equal(result.authentication.spf, "pass");
  assert.equal(result.authentication.dmarc, "fail");
  assert.ok(result.warnings.some((warning) => warning.includes("Reply-To")));
  assert.equal(result.received.length, 1);
});

test("file signature checker recognizes PNG and extension mismatch", () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const result = identifyFileSignature(bytes, "invoice.pdf");
  assert.equal(result.match?.mime, "image/png");
  assert.equal(result.extensionMatches, false);
});

test("string extractor finds printable sequences", () => {
  const bytes = new Uint8Array([0, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0, 0x78, 0x79]);
  assert.deepEqual(extractPrintableStrings(bytes, 4), ["hello"]);
});

test("timestamp decoder handles Unix and Windows FILETIME", () => {
  assert.equal(decodeTimestamp("0", "unix-seconds").toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(decodeTimestamp("116444736000000000", "filetime").toISOString(), "1970-01-01T00:00:00.000Z");
});

test("secret scanner masks findings and reports source lines", () => {
  const findings = scanSecrets("safe=true\nAWS_KEY=AKIA1234567890ABCDEF");
  assert.equal(findings[0].type, "AWS Access Key");
  assert.equal(findings[0].line, 2);
  assert.doesNotMatch(findings[0].preview, /AKIA1234567890ABCDEF/);
});

test("hash identifier returns ambiguous candidates for 32 hex chars", () => {
  const result = identifyHash("5d41402abc4b2a76b9719d911017c592");
  assert.ok(result.candidates.some((candidate) => candidate.name === "MD5"));
  assert.ok(result.candidates.some((candidate) => candidate.name === "NTLM"));
});

test("hex viewer formats offsets, bytes, and ASCII", () => {
  const result = formatHexView(new Uint8Array([0x41, 0x42, 0x00]));
  assert.match(result.text, /^00000000  41 42 00/);
  assert.match(result.text, /\|AB\.\|$/);
});

test("URL analyzer flags embedded credentials and insecure transport", () => {
  const result = analyzeUrlRisk("http://trusted.example@evil.com/login");
  assert.equal(result.hostname, "evil.com");
  assert.ok(result.flags.some((flag) => flag.label.includes("帳號或密碼")));
  assert.ok(result.flags.some((flag) => flag.label.includes("HTTPS")));
});

test("chmod calculator renders symbolic permissions and flags SUID", () => {
  const result = calculateChmod("4755");
  assert.equal(result.symbolic, "rwsr-xr-x");
  assert.ok(result.warnings.some((warning) => warning.includes("SUID")));
});

test("XOR tool round-trips repeating-key ciphertext", () => {
  const encrypted = xorTransform("flag{test}", "key");
  const decrypted = xorTransform(encrypted.hex, "key", true);
  assert.equal(decrypted.text, "flag{test}");
  assert.ok(bruteForceSingleByteXor("272e2f2f2c").length > 0);
});

test("Caesar brute force includes ROT13 plaintext", () => {
  assert.equal(caesarBruteforce("synt")[13].text, "flag");
});

test("base and ASCII converters preserve large integer precision", () => {
  assert.equal(convertNumberBase("FFFFFFFFFFFFFFFF", 16, 10), "18446744073709551615");
  assert.equal(asciiToNumbers("A", 16), "41");
});

test("integer packing supports p64 little endian", () => {
  const packed = packInteger("4198400", 64, true);
  assert.equal(unpackInteger(packed, true), "4198400");
});

test("RSA helpers calculate gcd, inverse, and modular exponent", () => {
  assert.equal(gcdBigInt(48n, 18n), 6n);
  assert.equal(modInverse(3n, 11n), 4n);
  assert.equal(powMod(4n, 13n, 497n), 445n);
});

test("HOTP and TOTP match RFC 4226 and RFC 6238 vectors", async () => {
  const toBase32 = (value) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const byte of Buffer.from(value)) bits += byte.toString(2).padStart(8, "0");
    return bits.match(/.{1,5}/g).map((chunk) => alphabet[parseInt(chunk.padEnd(5, "0"), 2)]).join("");
  };
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(await generateHotp(secret, 0n), "755224");
  assert.equal(await generateHotp(secret, 1n), "287082");
  assert.deepEqual(await generateTotp(secret, 59, 30, 8), { code: "94287082", counter: 1n, remainingSeconds: 1 });
  assert.equal((await generateTotp(toBase32("12345678901234567890123456789012"), 59, 30, 8, "SHA-256")).code, "46119246");
  assert.equal((await generateTotp(toBase32("1234567890123456789012345678901234567890123456789012345678901234"), 59, 30, 8, "SHA-512")).code, "90693936");
});

test("IP converter normalizes IPv4 and compresses IPv6", () => {
  assert.deepEqual(analyzeIpAddress("192.0.2.1"), {
    version: 4,
    normalized: "192.0.2.1",
    expanded: "192.0.2.1",
    decimal: "3221225985",
    hexadecimal: "0xc0000201",
    binary: "11000000.00000000.00000010.00000001",
    reverseDns: "1.2.0.192.in-addr.arpa",
  });
  const ipv6 = analyzeIpAddress("2001:0db8:0000:0000:0000:ff00:0042:8329");
  assert.equal(ipv6.normalized, "2001:db8::ff00:42:8329");
  assert.equal(ipv6.expanded, "2001:0db8:0000:0000:0000:ff00:0042:8329");
  assert.match(ipv6.reverseDns, /\.ip6\.arpa$/);
  assert.equal(analyzeIpAddress("[::1]").normalized, "::1");
  assert.throws(() => analyzeIpAddress("[::1"), /方括號/);
});

test("Unicode escape codec handles JavaScript, code points, and numeric entities", () => {
  assert.equal(decodeEscapedText("\\u0066\\x6c\\u{61}g", "javascript"), "flag");
  assert.equal(decodeEscapedText("U+1F600 U+0021", "codepoints"), "😀!");
  assert.equal(decodeEscapedText("&#x66;&#108;ag", "html-numeric"), "flag");
  assert.equal(encodeEscapedText("資😀", "codepoints"), "U+8CC7 U+1F600");
});

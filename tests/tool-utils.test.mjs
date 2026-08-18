import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeEmailHeaders,
  analyzeSecurityHeaders,
  base64ToUtf8,
  calculateCidr,
  calculateCvss,
  calculateEntropy,
  decodeTimestamp,
  defang,
  extractIocs,
  extractPrintableStrings,
  identifyFileSignature,
  refang,
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

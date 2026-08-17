import assert from "node:assert/strict";
import test from "node:test";
import {
  base64ToUtf8,
  calculateCidr,
  calculateCvss,
  calculateEntropy,
  defang,
  extractIocs,
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

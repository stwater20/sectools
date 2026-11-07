import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { detectFile, detectInput, noPrefill, toolActions } from "../lib/detect.ts";
import { toolCatalog } from "../lib/tool-catalog.ts";

const best = (value) => detectInput(value, 1)[0]?.slug;

test("pasted values map to the tool that fits them", () => {
  const cases = {
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c": "jwt-decoder",
    "5d41402abc4b2a76b9719d911017c592": "hash-identifier",
    "$2b$12$abcdefghijklmnopqrstuuJ9qOZ6l7F4Wv5yG2z9Q8m1aB2cD3eF4": "hash-identifier",
    "SGVsbG8gV29ybGQh": "base64-codec",
    "eJxLy0lMr67KyUyKz8xLy0ksSU2pVXjUMEUhOT+3oCi1uDg1RaE8syRDIaCyJCM/TwGkUg8mp6EJACAwGI8=": "compression-codec",
    "gASVHQAAAAAAAACMBXBvc2l4lIwGc3lzdGVtlJOUjAJpZJSFlFKULg==": "pickle-analyzer",
    "666c61677b6865787d": "base-ascii-converter",
    "01100110 01101100 01100001 01100111": "base-ascii-converter",
    "https://account.example@evil.test/login": "url-risk-analyzer",
    "hxxps://evil[.]com/x": "url-defanger",
    "192.168.1.1": "ip-address-converter",
    "10.0.0.0/8": "cidr-calculator",
    "10.0.0.1 10.0.0.2 10.0.1.0/24": "ipv4-cidr-aggregator",
    "1723948800": "timestamp-decoder",
    "rwxr-xr-x": "chmod-calculator",
    "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H": "cvss-calculator",
    "Uryyb Jbeyq, guvf vf n frperg zrffntr": "caesar-bruteforce",
    "synt{ebg13_vf_sha}": "caesar-bruteforce",
    "... --- ...": "morse-code",
    "++++++++[>++++[>++>+++<<-]>.]": "brainfuck-interpreter",
    "..%2f..%2fetc%2fpasswd": "path-traversal-analyzer",
    "%66%6c%61%67": "url-codec",
    "\\u0066\\u006c\\u0061\\u0067": "unicode-escape-codec",
    'O:4:"User":1:{s:4:"name";s:5:"guest";}': "php-unserialize",
    "JBSWY3DPEBLW64TMMQ======": "base-family-codec",
    "n = 123456789012345678901234567890123\ne = 65537\nc = 1234": "rsa-solver",
    "aws_key = AKIAIOSFODNN7EXAMPLE": "secret-scanner",
    "Received: from a by b\nFrom: x@y.com\nSubject: hi": "email-header-analyzer",
    "GET /index.html HTTP/1.1\nHost: x": "http-message-parser",
    "default-src 'self'; script-src 'self'": "csp-policy-analyzer",
    "C2 at 8.8.8.8 and evil.com, hash 5d41402abc4b2a76b9719d911017c592, also 1.2.3.4": "ioc-extractor",
  };
  for (const [value, slug] of Object.entries(cases)) assert.equal(best(value), slug, JSON.stringify(value));
  assert.deepEqual(detectInput("   "), []);
  assert.ok(detectInput("??").length > 0, "unknown input still gets a fallback");
});

test("dropped files map to tools by their magic bytes", async () => {
  const png = new Uint8Array(await readFile(new URL("./e2e/fixtures/short-height.png", import.meta.url)));
  assert.equal(detectFile(png, "x.png")[0].slug, "png-crc-fixer");
  assert.equal(detectFile(new Uint8Array(await readFile(new URL("./e2e/fixtures/exif.jpg", import.meta.url))), "a.jpg")[0].slug, "exif-viewer");
  assert.equal(detectFile(new Uint8Array(await readFile(new URL("./e2e/fixtures/encrypted.zip", import.meta.url))), "a.zip")[0].slug, "zip-inspector");
  assert.equal(detectFile(new TextEncoder().encode("RIFF0000WAVEfmt "), "a.wav")[0].slug, "audio-spectrogram");
  assert.equal(detectFile(new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]), "c.pcap")[0].slug, "pcap-summary-analyzer");
  assert.equal(detectFile(new Uint8Array([0x80, 0x04, 0x95]), "m.pkl")[0].slug, "pickle-analyzer");
  assert.equal(detectFile(new Uint8Array([1, 2, 3]), "x.bin")[0].slug, "file-signature-checker");
});

test("every suggested slug, action and prefill exception refers to a real tool", async () => {
  const slugs = new Set(toolCatalog.map((tool) => tool.slug));
  const source = await readFile(new URL("../lib/detect.ts", import.meta.url), "utf8");
  for (const [, slug] of source.matchAll(/add\("([a-z0-9-]+)"/g)) assert.ok(slugs.has(slug), slug);
  for (const slug of [...Object.keys(toolActions), ...noPrefill]) assert.ok(slugs.has(slug), slug);
  // Each action must be a button label the English dictionary knows, so the receiver can find it on /en/ pages.
  const { translate } = await import("../lib/translate.ts");
  for (const label of new Set([...Object.values(toolActions), "Refang", "數值 → ASCII"])) assert.doesNotMatch(translate("en", label), /[㐀-鿿]/, label);
});

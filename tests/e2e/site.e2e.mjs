// Browser end-to-end tests against the static export in out/.
// Run `npm run build` first, then `npm run test:e2e`.
import assert from "node:assert/strict";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { toolCatalog } from "../../lib/tool-catalog.ts";

const outDir = fileURLToPath(new URL("../../out/", import.meta.url));
if (!existsSync(join(outDir, "index.html"))) throw new Error("out/ is missing; run `npm run build` first.");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };
const server = createServer((request, response) => {
  let path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  let file = join(outDir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  const found = existsSync(file) && file.startsWith(outDir);
  if (!found) file = join(outDir, "404.html");
  response.writeHead(found ? 200 : 404, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const B = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`✓ ${name}`); } catch (error) { failures.push(`${name}: ${error.message}`); console.log(`✗ ${name}: ${error.message}`); }
}

// --- Every tool returns correct results without network requests ---
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
const ta = (p, n = 0) => p.locator(".workbench textarea").nth(n);
const inp = (p, n = 0) => p.locator(".workbench input:not([type=checkbox]):not([type=range]):not([type=file])").nth(n);
const click = (p, name) => p.locator(".workbench").getByRole("button", { name, exact: true }).first().click();
const file = (p, name, bytes) => p.locator(".workbench input[type=file]").setInputFiles({ name, mimeType: "application/octet-stream", buffer: Buffer.from(bytes) });
async function has(p, text) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const body = await p.locator(".workbench").innerText();
    const values = await p.locator(".workbench textarea").evaluateAll((els) => els.map((e) => e.value).join("\n"));
    if (body.includes(text) || values.includes(text)) return;
    await p.waitForTimeout(100);
  }
  throw new Error(`expected "${text}"`);
}

const specs = {
  "base64-codec": async (p) => { await ta(p).fill("你好 SecTools"); await click(p, "編碼"); await has(p, "5L2g5aW9IFNlY1Rvb2xz"); await ta(p).fill("5L2g5aW9"); await click(p, "解碼"); await has(p, "你好"); },
  "url-codec": async (p) => { await ta(p).fill("a b&c=中"); await click(p, "編碼"); await has(p, "a%20b%26c%3D%E4%B8%AD"); },
  "hash-generator": async (p) => { await ta(p).fill("abc"); await click(p, "計算雜湊"); await has(p, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"); },
  "sri-generator": async (p) => { await ta(p).fill("alert(1)"); await click(p, "計算 SRI"); await has(p, "sha384-HT2E9NfWiuQ/w1PRai+hTyqW16NIoCGA/m8VQDUopfAtcz6YQjtsMmQd5uRbVDpW"); },
  "hmac-generator": async (p) => { await ta(p).fill("The quick brown fox jumps over the lazy dog"); await inp(p).fill("key"); await click(p, "產生 HMAC"); await has(p, "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"); },
  "jwt-decoder": async (p) => { await ta(p).fill("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"); await click(p, "安全解碼"); await has(p, "John Doe"); await has(p, "已過期"); },
  "jwt-signature-verifier": async (p) => { await click(p, "驗證 JWT 簽章"); await has(p, "簽章有效"); await ta(p, 1).fill("wrong-secret"); await click(p, "驗證 JWT 簽章"); await has(p, "簽章無效"); },
  "password-generator": async (p) => { await click(p, "產生安全密碼"); const pw = await p.locator(".password-result code").innerText(); if (pw.length !== 24) throw new Error(`length ${pw.length}`); },
  "password-strength": async (p) => { await inp(p).fill("password"); await has(p, "弱"); await inp(p).fill("v9#Lq2!xT7@pZr4$Wm8&"); await has(p, "非常強"); },
  "otp-generator": async (p) => { await click(p, "HOTP（Counter 型）"); await inp(p, 0).fill("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"); await inp(p, 1).fill("1"); await click(p, "產生 HOTP"); await has(p, "287082"); await click(p, "TOTP（時間型）"); await inp(p, 0).fill("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"); await click(p, "產生 TOTP"); await has(p, "ONE-TIME PASSWORD"); },
  "ioc-extractor": async (p) => { await ta(p).fill("C2 at 8.8.8.8 and hxxp://evil[.]example.com/a, mail bad@phish.test, md5 5d41402abc4b2a76b9719d911017c592"); await click(p, "擷取 IOC"); await has(p, "8.8.8.8"); await has(p, "bad@phish.test"); await has(p, "5d41402abc4b2a76b9719d911017c592"); },
  "url-defanger": async (p) => { await ta(p).fill("https://evil.com/x"); await click(p, "Defang"); await has(p, "hxxps"); await has(p, "evil[.]com"); await ta(p).fill("hxxps://evil[.]com"); await click(p, "Refang"); await has(p, "https://evil.com"); },
  "entropy-calculator": async (p) => { await ta(p).fill("aaaa"); await has(p, "0.0000"); await ta(p).fill("abcd"); await has(p, "2.0000"); },
  "cidr-calculator": async (p) => { await click(p, "計算網段"); await has(p, "192.168.10.255"); await has(p, "254"); await inp(p).fill("10.0.0.1/33"); await click(p, "計算網段"); await p.locator(".error-notice").waitFor(); },
  "ip-address-converter": async (p) => { await inp(p).fill("192.168.1.1"); await click(p, "解析與轉換"); await has(p, "3232235777"); await has(p, "1.1.168.192.in-addr.arpa"); },
  "ipv6-cidr-calculator": async (p) => { await click(p, "計算 IPv6 網段"); await has(p, "2001:db8:1234:5678::/64"); await has(p, "8.7.6.5.4.3.2.1.8.b.d.0.1.0.0.2.ip6.arpa"); },
  "ipv4-cidr-aggregator": async (p) => { await click(p, "合併 CIDR 清單"); await has(p, "10.0.0.0/24"); await has(p, "192.0.2.10/32"); },
  "cvss-calculator": async (p) => { await has(p, "9.8"); await has(p, "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"); await p.locator(".cvss-controls fieldset").nth(0).getByRole("button", { name: "Physical" }).click(); await has(p, "6.8"); },
  "security-headers-analyzer": async (p) => { await ta(p).fill("HTTP/2 200\nStrict-Transport-Security: max-age=63072000; includeSubDomains; preload\nContent-Security-Policy: default-src 'self'\nX-Content-Type-Options: nosniff"); await click(p, "分析安全標頭"); await has(p, "/ 100"); await has(p, "Strict-Transport-Security"); },
  "csp-policy-analyzer": async (p) => { await click(p, "深度分析 CSP"); await has(p, "Grade"); await has(p, "script-src"); },
  "http-message-parser": async (p) => { await ta(p).fill("POST /login?next=%2Fadmin HTTP/1.1\nHost: example.test\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 20\n\nuser=admin&pass=test"); await click(p, "解析 HTTP 訊息"); await has(p, "HTTP REQUEST"); await has(p, "POST"); await has(p, "/admin"); },
  "dns-message-decoder": async (p) => { await click(p, "解碼 DNS 封包"); await has(p, "www.example.com"); await has(p, "93.184.216.34"); },
  "email-header-analyzer": async (p) => { await ta(p).fill("Received: from mail.example.com by mx.test\nAuthentication-Results: mx.test; spf=pass smtp.mailfrom=example.com; dkim=fail; dmarc=pass\nFrom: Alice <alice@example.com>\nReply-To: attacker@evil.test\nSubject: Invoice\nDate: Mon, 1 Jan 2024 00:00:00 +0000\nMessage-ID: <1@example.com>"); await click(p, "分析郵件標頭"); await has(p, "SPF"); await has(p, "alice@example.com"); await has(p, "attacker@evil.test"); },
  "file-signature-checker": async (p) => { await file(p, "image.jpg", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]); await has(p, "PNG"); await has(p, "不一致"); },
  "pcap-summary-analyzer": async (p) => { await click(p, "載入內建 DNS／UDP 範例"); await has(p, "built-in-dns-sample.pcap"); await has(p, "192.0.2.1"); },
  "string-extractor": async (p) => { await file(p, "bin.dat", [0, 1, 2, ...Buffer.from("hello-secret-string"), 0, 255, ...Buffer.from("abc"), 0]); await has(p, "hello-secret-string"); await has(p, "1 個字串"); },
  "timestamp-decoder": async (p) => { await inp(p).fill("1723948800"); await click(p, "解碼時間"); await has(p, "2024-08-18T02:40:00.000Z"); await p.locator(".workbench select").selectOption("filetime"); await inp(p).fill("116444736000000000"); await click(p, "解碼時間"); await has(p, "1970-01-01T00:00:00.000Z"); },
  "secret-scanner": async (p) => { await ta(p).fill("aws_key = AKIAIOSFODNN7EXAMPLE\nfoo = bar"); await has(p, "找到"); await has(p, "L1"); },
  "hash-identifier": async (p) => { await inp(p).fill("5d41402abc4b2a76b9719d911017c592"); await has(p, "MD5"); await inp(p).fill("$2b$12$abcdefghijklmnopqrstuuJ9qOZ6l7F4Wv5yG2z9Q8m1aB2cD3eF4"); await has(p, "bcrypt"); },
  "hex-viewer": async (p) => { await file(p, "abc.txt", Buffer.from("ABC")); await has(p, "41 42 43"); },
  "url-risk-analyzer": async (p) => { await inp(p).fill("https://account.example@evil.test/login"); await click(p, "拆解 URL"); await has(p, "evil.test"); await has(p, "注意事項"); },
  "chmod-calculator": async (p) => { await has(p, "rwxr-xr-x"); await inp(p).fill("4777"); await has(p, "安全提醒"); },
  "xor-tool": async (p) => { await ta(p).fill("Hello"); await inp(p).fill("k"); await click(p, "執行重複 XOR"); await has(p, "230e070704"); await ta(p).fill(Buffer.from("flag{x0r_is_fun}").map((b) => b ^ 0x5a).toString("hex")); await click(p, "Single-byte 暴力枚舉"); const top = await p.locator(".candidate-list > div").first().innerText(); if (!top.includes("flag{x0r_is_fun}") || !top.includes("0x5a")) throw new Error(`top candidate: ${top}`); },
  "caesar-bruteforce": async (p) => { await ta(p).fill("Uryyb Jbeyq"); await has(p, "Hello World"); },
  "base-ascii-converter": async (p) => { await ta(p).fill("ff 10"); await click(p, "轉換進位"); await has(p, "255 16"); await ta(p).fill("66 6c 61 67"); await click(p, "數值 → ASCII"); await has(p, "flag"); },
  "integer-packer": async (p) => { await inp(p).fill("4198400"); await click(p, "Pack"); await has(p, "00 10 40 00 00 00 00 00"); await inp(p).fill("00 10 40 00 00 00 00 00"); await click(p, "Unpack"); await has(p, "4198400"); },
  "rsa-math-helper": async (p) => { await inp(p, 0).fill("12"); await inp(p, 1).fill("18"); await click(p, "GCD(A, B)"); await has(p, "6"); await inp(p, 0).fill("3"); await inp(p, 1).fill("11"); await click(p, "A⁻¹ mod B"); await has(p, "4"); await inp(p, 0).fill("4"); await inp(p, 1).fill("13"); await inp(p, 2).fill("497"); await click(p, "Aᴮ mod M"); await has(p, "445"); },
  "unicode-escape-codec": async (p) => { await ta(p).fill("\\u0066\\u006c\\u0061\\u0067"); await click(p, "解碼"); await has(p, "flag"); },
  "layered-decoder": async (p) => { await ta(p).fill("%5A%6D%78%68%5A%77%3D%3D"); await click(p, "自動逐層解碼"); await has(p, "flag"); },
  "vigenere-cipher": async (p) => { await click(p, "載入範例"); await click(p, "自動破解 Key"); await has(p, "SECTOOLS"); await has(p, "flag{vigenere_cracked}"); },
  "classic-ciphers": async (p) => {
    await click(p, "載入範例"); await click(p, "轉換（加解密相同）"); await has(p, "flag{atbash_mirror}");
    await click(p, "ROT47"); await click(p, "載入範例"); await click(p, "轉換（加解密相同）"); await has(p, "flag{rot47_shifts_symbols}");
    await click(p, "Affine"); await click(p, "載入範例"); await click(p, "暴力枚舉"); await has(p, "flag{affine_cipher} the key was easy to find");
    await click(p, "Rail Fence"); await click(p, "載入範例"); await click(p, "暴力枚舉"); await has(p, "WEAREDISCOVEREDFLEEATONCE");
    await click(p, "Bacon"); await click(p, "載入範例"); await click(p, "解密"); await has(p, "FLAG");
  },
  "morse-code": async (p) => { await click(p, "載入範例"); await click(p, "解碼摩斯碼"); await has(p, "FLAG MORSE IS FUN"); await ta(p).fill("SOS"); await click(p, "文字轉摩斯碼"); await has(p, "... --- ..."); },
  "base-family-codec": async (p) => { await click(p, "載入範例"); await click(p, "解碼"); await has(p, "flag{base58_rocks}"); await ta(p).fill("JBSWY3DPEBLW64TMMQ======"); await click(p, "自動辨識"); await has(p, "Hello World"); },
  "frequency-analysis": async (p) => { await click(p, "載入範例"); await has(p, "ROT 13"); await has(p, "重合指數"); },
  "rsa-solver": async (p) => { await click(p, "載入範例"); await click(p, "自動求解"); await has(p, "Fermat"); await has(p, "flag!"); },
  "brainfuck-interpreter": async (p) => { await click(p, "載入範例"); await click(p, "執行"); await has(p, "Hello World!"); await ta(p).fill("Ook. Ook? Ook. Ook. Ook! Ook."); await click(p, "執行"); await has(p, "已將 Ook! 轉為 Brainfuck"); },
  "jwt-forger": async (p) => {
    await click(p, "載入範例"); await click(p, "產生 JWT");
    const token = await p.locator(".workbench .result-block code").innerText();
    const [header, payload, signature] = token.split(".");
    const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());
    if (decode(header).alg !== "none" || decode(payload).role !== "admin" || signature !== "") throw new Error(`unexpected token ${token}`);
    await p.locator(".workbench select").selectOption("HS256"); await inp(p, 0).fill("secret"); await click(p, "產生 JWT");
    await has(p, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    await click(p, "載入 Header／Payload"); await has(p, "\"role\": \"user\"");
  },
  "lsb-steganography": async (p) => {
    const png = await p.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
      const context = canvas.getContext("2d"); const image = context.createImageData(32, 32);
      const message = new TextEncoder().encode("flag{lsb_found}"); let bit = 0;
      for (let index = 0; index < image.data.length; index += 4) {
        for (let channel = 0; channel < 3; channel += 1) {
          const byte = message[Math.floor(bit / 8)] ?? 0;
          image.data[index + channel] = 0x80 | ((byte >> (7 - (bit % 8))) & 1); bit += 1;
        }
        image.data[index + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await p.locator(".workbench input[type=file]").setInputFiles({ name: "stego.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await has(p, "flag{lsb_found}");
  },
  "qr-code-decoder": async (p) => {
    await p.locator(".workbench input[type=file]").setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: await readFile(new URL("./fixtures/qr-flag.png", import.meta.url)) });
    await has(p, "flag{qr_decoded_locally}");
  },
  "hidden-data-scanner": async (p) => {
    const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, 0x50, 0x4b, 0x03, 0x04, ...Buffer.from("flag{hidden_zip}")];
    await file(p, "image.png", bytes); await has(p, "ZIP archive"); await has(p, "IEND 之後有額外資料"); await has(p, "flag{hidden_zip}");
  },
  "path-traversal-analyzer": async (p) => { await click(p, "分析 Path Traversal"); await has(p, "高風險"); await has(p, "etc/passwd"); },
};


for (const tool of toolCatalog) {
  await check(`tool ${tool.slug}`, async () => {
    if (!specs[tool.slug]) throw new Error("no e2e spec for this tool");
    const page = await ctx.newPage();
    const errors = [];
    const requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${B}/${tool.slug}/`, { waitUntil: "networkidle" });
    page.on("request", (r) => { if (!r.url().startsWith(`${B}/_next/`)) requests.push(r.url()); });
    try {
      await specs[tool.slug](page);
      assert.deepEqual(errors, [], "console errors");
      assert.deepEqual(requests, [], "network requests while using the tool");
    } finally { await page.close(); }
  });
}

// --- Site navigation, search, and preferences ---
const page = await ctx.newPage();
await check("home deep link ?q=", async () => {
  await page.goto(`${B}/?q=jwt`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#tool-search")?.value === "jwt");
  const count = await page.locator(".tool-grid .tool-card").count();
  assert.ok(count >= 2 && count < 10, `jwt results ${count}`);
});
await check("category filter syncs to URL", async () => {
  await page.goto(`${B}/?category=ctf`, { waitUntil: "networkidle" });
  await page.waitForFunction((count) => document.querySelectorAll(".tool-grid .tool-card").length === count, toolCatalog.filter((tool) => tool.category === "CTF 工具").length);
  await page.fill("#tool-search", "xor");
  await page.waitForURL(/q=xor.*category=ctf|category=ctf.*q=xor/);
});
await check("favorites filter", async () => {
  await page.goto(B, { waitUntil: "networkidle" });
  await page.locator(".favorite-button").first().click();
  await page.getByRole("button", { name: /★ 收藏/ }).click();
  assert.equal(await page.locator(".tool-grid .tool-card").count(), 1);
});
await check("'/' focuses the hero search", async () => {
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press("/");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "tool-search");
});
await check("command palette opens and navigates", async () => {
  await page.goto(`${B}/jwt-decoder/`, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  await page.locator("dialog.palette[open]").waitFor();
  await page.keyboard.type("base64");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/base64-codec\/$/);
  await page.locator("h1", { hasText: "Base64" }).waitFor();
});
await check("tool page visit is recorded as recent", async () => {
  await page.goto(B, { waitUntil: "networkidle" });
  await page.locator(".recent-strip a", { hasText: "Base64" }).first().waitFor({ timeout: 5000 });
});
await check("theme toggle persists across reloads", async () => {
  await page.click(".theme-toggle");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
});
await check("legacy /tools/ URLs redirect", async () => {
  await page.goto(`${B}/tools/hash-generator/`);
  await page.waitForURL(`${B}/hash-generator/`);
});
await ctx.close();

// --- No horizontal overflow or runtime errors on any page ---
const pages = ["/", "/about/", ...readdirSync(join(outDir, "categories")).map((slug) => `/categories/${slug}/`), ...toolCatalog.map((tool) => `/${tool.slug}/`)];
for (const [width, scheme] of [[320, "light"], [390, "dark"], [768, "light"], [1280, "light"]]) {
  await check(`layout ${width}px ${scheme} (${pages.length} pages)`, async () => {
    const view = await browser.newPage({ viewport: { width, height: 800 }, colorScheme: scheme });
    const problems = [];
    view.on("pageerror", (e) => problems.push(`${view.url()} ${e.message}`));
    for (const path of pages) {
      await view.goto(B + path, { waitUntil: "load" });
      const scrollWidth = await view.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width) problems.push(`${path} overflows to ${scrollWidth}px`);
    }
    await view.close();
    assert.deepEqual(problems, []);
  });
}

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed:\n${failures.join("\n")}` : "\nAll e2e checks passed.");
process.exitCode = failures.length ? 1 : 0;

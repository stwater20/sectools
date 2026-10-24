// Render a 1200×630 share image for every tool and guide in both languages into public/og/.
// Usage: FONT_DIR=/path/to/fonts node scripts/og-images.mjs [slug…]
// FONT_DIR must contain noto-sans-tc-chinese-traditional-{500,900}-normal.woff2 (from @fontsource/noto-sans-tc)
// and inter-latin-wght-normal.woff2 (from @fontsource-variable/inter). Re-run after adding a tool or guide.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { categoriesEn, toolsEn } from "../lib/content-en.ts";
import { guides } from "../lib/guides.ts";
import { categories, toolCatalog } from "../lib/tool-catalog.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontDir = process.env.FONT_DIR;
if (!fontDir) throw new Error("Set FONT_DIR to a folder with the Noto Sans TC and Inter woff2 files.");
const font = (name) => {
  const path = join(fontDir, name);
  if (!existsSync(path)) throw new Error(`Missing font ${path}`);
  return `data:font/woff2;base64,${readFileSync(path).toString("base64")}`;
};
const fonts = { tc500: font("noto-sans-tc-chinese-traditional-500-normal.woff2"), tc900: font("noto-sans-tc-chinese-traditional-900-normal.woff2"), inter: font("inter-latin-wght-normal.woff2") };
const escape = (value) => String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

const logo = `<svg viewBox="4 8 56 44"><path d="M17 39V29c0-8 6-14 14-14s14 6 14 14v10" stroke="#28566e" stroke-width="6"/><path d="M9 40V34c0-5 4-9 9-9M55 40v-6c0-5-4-9-9-9" stroke="#e2702e" stroke-width="5"/><path d="M10 47h44" stroke="#1d2327" stroke-width="5"/></svg>`;

function page({ locale, kicker, title, subtitle, description, icon, url }) {
  const brandSub = locale === "en" ? "Security Toolkit" : "資安工具箱";
  const badge = locale === "en" ? "Free · Runs in your browser · No uploads" : "免費 · 瀏覽器本機執行 · 不上傳";
  const size = title.length > (locale === "en" ? 34 : 16) ? 58 : title.length > (locale === "en" ? 22 : 11) ? 70 : 84;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:TC;font-weight:500;src:url(${fonts.tc500})}
@font-face{font-family:TC;font-weight:900;src:url(${fonts.tc900})}
@font-face{font-family:Inter;font-weight:100 900;src:url(${fonts.inter})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#f7f6f3;font-family:Inter,TC,sans-serif;color:#1d2327;position:relative;overflow:hidden}
.glow{position:absolute;border-radius:50%;filter:blur(90px)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(15,23,42,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.05) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 80% 80% at 30% 20%,#000 30%,transparent 80%)}
.brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:26px;letter-spacing:-.02em}
.brand span{color:#7d8496;font-weight:500}
.mark{width:50px;height:50px;border-radius:14px;background:#fff;border:1.5px solid #d9d6cf;display:grid;place-items:center;box-shadow:0 8px 20px -10px rgba(80,40,12,.4)}
.mark svg{width:36px;height:36px;fill:none;stroke-linecap:round}
.main{position:absolute;left:72px;top:170px;width:790px}
.kicker{display:inline-block;padding:7px 14px;border-radius:999px;background:#fff1e6;color:#c4561c;font:700 18px Inter,TC,sans-serif;letter-spacing:.02em}
h1{margin-top:22px;font-weight:900;font-size:${size}px;line-height:1.12;letter-spacing:-.03em}
.sub{margin-top:10px;font-size:26px;color:#7d8496;font-weight:600}
.desc{margin-top:22px;font-size:24px;line-height:1.55;color:#4d5566;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.icon{position:absolute;right:84px;top:190px;width:230px;height:230px;border-radius:48px;background:linear-gradient(140deg,#fff,#fff4ea);border:2px solid #ecdccd;box-shadow:0 40px 80px -30px rgba(160,70,20,.45);display:grid;place-items:center;color:#e2702e;font:800 ${icon.length > 3 ? 54 : icon.length > 2 ? 64 : 88}px ui-monospace,Menlo,monospace}
.foot{position:absolute;left:72px;right:72px;bottom:52px;display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:600}
.foot .ok{display:flex;align-items:center;gap:10px;color:#227a56}
.foot .ok i{width:10px;height:10px;border-radius:50%;background:#227a56;box-shadow:0 0 0 5px rgba(18,130,88,.15)}
.foot .url{color:#7d8496;font-family:Inter,sans-serif}
</style></head><body>
<div class="glow" style="width:520px;height:420px;left:-140px;top:-200px;background:rgba(240,132,58,.30)"></div>
<div class="glow" style="width:480px;height:380px;right:-120px;bottom:-170px;background:rgba(40,86,110,.16)"></div>
<div class="grid"></div>
<div class="brand"><span class="mark">${logo}</span><div>SecTools <span>${brandSub}</span></div></div>
<div class="main"><span class="kicker">${escape(kicker)}</span><h1>${escape(title)}</h1>${subtitle ? `<div class="sub">${escape(subtitle)}</div>` : ""}<p class="desc">${escape(description)}</p></div>
<div class="icon">${escape(icon)}</div>
<div class="foot"><span class="ok"><i></i>${badge}</span><span class="url">${escape(url)}</span></div>
</body></html>`;
}

const jobs = [];
for (const tool of toolCatalog) {
  const category = categories.find((item) => item.name === tool.category);
  jobs.push({ file: `og/${tool.slug}.jpg`, slug: tool.slug, html: page({ locale: "zh", kicker: category.name, title: tool.name, subtitle: tool.englishName, description: tool.description, icon: tool.icon, url: `tools.sectools.tw/${tool.slug}/` }) });
  jobs.push({ file: `og/en/${tool.slug}.jpg`, slug: tool.slug, html: page({ locale: "en", kicker: categoriesEn[category.slug].name, title: tool.englishName, description: toolsEn[tool.slug].description, icon: tool.icon, url: `tools.sectools.tw/en/${tool.slug}/` }) });
}
for (const guide of guides) {
  jobs.push({ file: `og/guides/${guide.slug}.jpg`, slug: guide.slug, html: page({ locale: "zh", kicker: "教學指南", title: guide.zh.title.split(/[：？]/)[0] + (guide.zh.title.includes("？") ? "？" : ""), description: guide.zh.description, icon: guide.icon, url: `tools.sectools.tw/guides/${guide.slug}/` }) });
  jobs.push({ file: `og/en/guides/${guide.slug}.jpg`, slug: guide.slug, html: page({ locale: "en", kicker: "Guide", title: guide.en.title.split(/[:?]/)[0] + (guide.en.title.includes("?") ? "?" : ""), description: guide.en.description, icon: guide.icon, url: `tools.sectools.tw/en/guides/${guide.slug}/` }) });
}

const only = new Set(process.argv.slice(2));
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const view = await browser.newPage({ viewport: { width: 1200, height: 630 } });
let count = 0;
for (const job of jobs) {
  if (only.size && !only.has(job.slug)) continue;
  const target = join(root, "public", job.file);
  mkdirSync(join(target, ".."), { recursive: true });
  await view.setContent(job.html, { waitUntil: "load" });
  await view.evaluate(() => document.fonts.ready);
  writeFileSync(target, await view.screenshot({ type: "jpeg", quality: 72 }));
  count += 1;
}
await browser.close();
console.log(`Rendered ${count} share images into public/og/.`);

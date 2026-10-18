import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { toolCatalog } from "../lib/tool-catalog.ts";

test("catalog has unique slugs and meaningful SEO copy", () => {
  assert.ok(toolCatalog.length >= 12);
  assert.equal(new Set(toolCatalog.map((tool) => tool.slug)).size, toolCatalog.length);
  for (const tool of toolCatalog) {
    assert.match(tool.slug, /^[a-z0-9-]+$/);
    assert.ok(tool.description.length >= 20);
  }
});

test("every catalog entry has a workbench implementation", async () => {
  const workbench = await readFile(new URL("../components/tool-workbench.tsx", import.meta.url), "utf8");
  for (const tool of toolCatalog) assert.ok(workbench.includes(`case "${tool.slug}"`), `${tool.slug} is missing its workbench`);
});

test("layout avoids a meta CSP that breaks hydration behind Cloudflare", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /httpEquiv="Content-Security-Policy"/);
  assert.doesNotMatch(layout, /https:\/\/fonts\./);
});

test("tool pages include Traditional Chinese SEO metadata and indexable guidance", async () => {
  const page = await readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /keywords:/);
  assert.match(page, /如何使用 \{tool\.name\}/);
  assert.match(page, /常見用途/);
  assert.match(page, /FAQPage/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /inLanguage: siteLocale/);
  const site = await readFile(new URL("../lib/site.ts", import.meta.url), "utf8");
  assert.match(site, /siteLocale = "zh-Hant-TW"/);
});

test("tool links use short root URLs and legacy routes are noindex redirects", async () => {
  const [home, sitemap, legacy] = await Promise.all([
    readFile(new URL("../components/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /\/tools\/\$\{tool\.slug\}/);
  assert.doesNotMatch(sitemap, /\/tools\/\$\{tool\.slug\}/);
  assert.match(legacy, /index: false/);
  assert.match(legacy, /httpEquiv="refresh"/);
});

test("GitHub Pages workflow runs the full quality gate", async () => {
  const [workflow, cname] = await Promise.all([
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../public/CNAME", import.meta.url), "utf8"),
  ]);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /CUSTOM_DOMAIN: tools\.sectools\.tw/);
  assert.equal(cname.trim(), "tools.sectools.tw");
});

test("categories have unique slugs, SEO copy, and cover every tool", async () => {
  const { categories, relatedTools } = await import("../lib/tool-catalog.ts");
  assert.equal(new Set(categories.map((category) => category.slug)).size, categories.length);
  for (const category of categories) {
    assert.match(category.slug, /^[a-z0-9-]+$/);
    assert.ok(category.intro.length >= 60, `${category.slug} intro is too thin`);
  }
  for (const tool of toolCatalog) {
    assert.ok(categories.some((category) => category.name === tool.category), `${tool.slug} has no category page`);
    const related = relatedTools(tool);
    assert.ok(related.length >= 3, `${tool.slug} needs related tools`);
    assert.ok(!related.some((item) => item.slug === tool.slug));
  }
});

test("tool search ranks name matches first and requires every token", async () => {
  const { searchTools } = await import("../lib/search.ts");
  assert.equal(searchTools(toolCatalog, "jwt")[0].slug.startsWith("jwt"), true);
  assert.equal(searchTools(toolCatalog, "ＪＷＴ")[0].slug.startsWith("jwt"), true);
  assert.deepEqual(searchTools(toolCatalog, "ipv6 cidr").map((tool) => tool.slug)[0], "ipv6-cidr-calculator");
  assert.equal(searchTools(toolCatalog, "jwt pcap").length, 0);
  assert.equal(searchTools(toolCatalog, "   ").length, toolCatalog.length);
});

test("site metadata derives tool counts and lists category pages in the sitemap", async () => {
  const [layout, sitemap, home] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(layout, /\d+ 個隱私優先/);
  assert.match(layout, /toolCatalog\.length/);
  assert.match(sitemap, /\/categories\//);
  assert.match(home, /SearchAction/);
  assert.match(home, /ItemList/);
});

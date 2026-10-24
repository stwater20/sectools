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
  const layout = await readFile(new URL("../components/root-document.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /httpEquiv="Content-Security-Policy"/);
  assert.doesNotMatch(layout, /https:\/\/fonts\./);
});

test("tool pages include Traditional Chinese SEO metadata and indexable guidance", async () => {
  const [page, ui, i18n] = await Promise.all([
    readFile(new URL("../components/pages/tool-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ui.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /keywords:/);
  assert.match(page, /format\(strings\.howTo, tool\.name\)/);
  assert.match(ui, /howTo: "如何使用 \{0\}"/);
  assert.match(ui, /useCases: "\{0\}常見用途"/);
  assert.match(page, /FAQPage/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /inLanguage: htmlLang\[locale\]/);
  assert.match(page, /languages: languageAlternates\(path\)/);
  assert.match(i18n, /zh: "zh-Hant-TW"/);
});

test("tool links use short root URLs and legacy routes are noindex redirects", async () => {
  const [home, sitemap, legacy] = await Promise.all([
    readFile(new URL("../components/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/(zh)/tools/[slug]/page.tsx", import.meta.url), "utf8"),
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
  const [home, sitemap] = await Promise.all([
    readFile(new URL("../components/pages/home-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /\d+ 個免費線上資安工具/);
  assert.match(home, /toolCatalog\.length/);
  assert.match(sitemap, /\/categories\//);
  assert.match(sitemap, /alternates: \{ languages/);
  assert.match(home, /SearchAction/);
  assert.match(home, /ItemList/);
});

test("English dictionary covers every Chinese string the tool UIs pass to t()", async () => {
  const { enDictionary, enPatterns } = await import("../lib/i18n-en.ts");
  const missing = [];
  for (const file of ["../components/tool-workbench.tsx", "../components/ctf-tools.tsx", "../components/tool-ui.tsx", "../components/pro-tools.tsx", "../components/forensics-tools.tsx", "../components/serialization-tools.tsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const match of source.matchAll(/\bt\(("(?:[^"\\]|\\.)*")/g)) {
      const key = JSON.parse(match[1]).trim();
      if (/[\u3400-\u9fff]/.test(key) && !(key in enDictionary) && !enPatterns.some(([pattern]) => pattern.test(key))) missing.push(key);
    }
  }
  assert.deepEqual(missing, []);
});

test("English dictionary covers error messages thrown by the newer tool libraries", async () => {
  const { translate } = await import("../lib/translate.ts");
  const missing = [];
  for (const file of ["../lib/crypto-utils.ts", "../lib/archive-utils.ts", "../lib/media-utils.ts", "../components/forensics-tools.tsx", "../lib/serialization-utils.ts", "../lib/recipe-utils.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const match of source.matchAll(/Error\((?:"((?:[^"\\]|\\.)*)"|`([^`]*)`)\)/g)) {
      const text = match[1] !== undefined ? JSON.parse(`"${match[1]}"`) : match[2].replace(/\$\{[^}]+\}/g, "16");
      if (/[\u3400-\u9fff]/.test(translate("en", text))) missing.push(text);
    }
  }
  assert.deepEqual(missing, []);
});

test("English dictionary covers every recipe operation, argument and option label", async () => {
  const { recipeOperations } = await import("../lib/recipe-utils.ts");
  const { translate } = await import("../lib/translate.ts");
  const labels = recipeOperations.flatMap((operation) => [operation.label, operation.group, ...operation.args.flatMap((arg) => [arg.label, ...(arg.options ?? []).map(([, label]) => label)])]);
  assert.deepEqual(labels.filter((label) => /[\u3400-\u9fff]/.test(translate("en", label))), []);
});

test("every tool has English page content", async () => {
  const { toolsEn, categoriesEn } = await import("../lib/content-en.ts");
  const { categories } = await import("../lib/tool-catalog.ts");
  for (const tool of toolCatalog) {
    const copy = toolsEn[tool.slug];
    assert.ok(copy, `${tool.slug} is missing English content`);
    assert.ok(copy.description.length >= 30 && copy.intro.length >= 60, `${tool.slug} English copy is too thin`);
  }
  for (const category of categories) assert.ok(categoriesEn[category.slug], `${category.slug} is missing English content`);
});

test("guides are complete in both languages and link to real tools", async () => {
  const { guides } = await import("../lib/guides.ts");
  const slugs = new Set(toolCatalog.map((tool) => tool.slug));
  assert.ok(guides.length >= 5);
  assert.equal(new Set(guides.map((guide) => guide.slug)).size, guides.length);
  for (const guide of guides) {
    assert.match(guide.slug, /^[a-z0-9-]+$/);
    assert.match(guide.updated, /^\d{4}-\d{2}-\d{2}$/);
    for (const slug of guide.tools) assert.ok(slugs.has(slug), `${guide.slug} links unknown tool ${slug}`);
    assert.equal(guide.zh.sections.length, guide.en.sections.length, `${guide.slug} section count differs`);
    assert.equal(guide.zh.faq.length, guide.en.faq.length, `${guide.slug} FAQ count differs`);
    for (const locale of ["zh", "en"]) {
      const copy = guide[locale];
      assert.ok(copy.description.length >= 50 && copy.description.length <= (locale === "en" ? 160 : 100), `${guide.slug} ${locale} description length ${copy.description.length}`);
      for (const [index, section] of copy.sections.entries()) {
        assert.deepEqual(section.tools ?? [], guide.zh.sections[index].tools ?? [], `${guide.slug} ${locale} section ${index} tools differ`);
        for (const slug of section.tools ?? []) assert.ok(slugs.has(slug), `${guide.slug} section links unknown tool ${slug}`);
      }
    }
    assert.doesNotMatch(JSON.stringify(guide.en), /[\u3400-\u9fff]/, `${guide.slug} English copy contains Chinese`);
  }
});

test("every tool and guide has its own share image in both languages", async () => {
  const { existsSync } = await import("node:fs");
  const { guides } = await import("../lib/guides.ts");
  const files = [
    ...toolCatalog.flatMap((tool) => [`og/${tool.slug}.jpg`, `og/en/${tool.slug}.jpg`]),
    ...guides.flatMap((guide) => [`og/guides/${guide.slug}.jpg`, `og/en/guides/${guide.slug}.jpg`]),
  ];
  const missing = files.filter((file) => !existsSync(new URL(`../public/${file}`, import.meta.url)));
  assert.deepEqual(missing, [], "run `FONT_DIR=… node scripts/og-images.mjs` to render missing share images");
});

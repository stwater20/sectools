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

test("layout declares a restrictive local-first CSP", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /connect-src 'none'/);
  assert.match(layout, /object-src 'none'/);
  assert.match(layout, /form-action 'self'/);
  assert.doesNotMatch(layout, /https:\/\/fonts\./);
});

test("tool pages include Traditional Chinese SEO metadata and indexable guidance", async () => {
  const page = await readFile(new URL("../app/tools/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /keywords:/);
  assert.match(page, /如何使用 \{tool\.name\}/);
  assert.match(page, /常見用途/);
  assert.match(page, /FAQPage/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /zh-Hant-TW/);
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

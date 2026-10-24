import type { MetadataRoute } from "next";
import { localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { guides } from "@/lib/guides";
import { categories, toolCatalog } from "@/lib/tool-catalog";

export const dynamic = "force-static";

type Entry = { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number; lastModified?: string };

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: Entry[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    ...categories.map((category) => ({ path: `/categories/${category.slug}/`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...toolCatalog.map((tool) => ({ path: `/${tool.slug}/`, changeFrequency: "monthly" as const, priority: tool.featured ? 0.8 : 0.7 })),
    { path: "/guides/", changeFrequency: "weekly", priority: 0.7 },
    ...guides.map((guide) => ({ path: `/guides/${guide.slug}/`, changeFrequency: "monthly" as const, priority: 0.7, lastModified: guide.updated })),
    { path: "/about/", changeFrequency: "yearly", priority: 0.4 },
  ];
  const locales: Locale[] = ["zh", "en"];
  // Every page exists in both languages; each URL lists its alternates so search engines pair them.
  return locales.flatMap((locale) => pages.map(({ path, changeFrequency, priority, lastModified: updated }) => ({
    url: absoluteUrl(localePath(locale, path)),
    lastModified: updated ?? lastModified,
    changeFrequency,
    priority: locale === "zh" ? priority : Math.max(priority - 0.1, 0.3),
    alternates: { languages: { "zh-Hant-TW": absoluteUrl(path), en: absoluteUrl(localePath("en", path)) } },
  })));
}

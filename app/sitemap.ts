import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { categories, toolCatalog } from "@/lib/tool-catalog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...categories.map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}/`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...toolCatalog.map((tool) => ({
      url: absoluteUrl(`/${tool.slug}/`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: tool.featured ? 0.8 : 0.7,
    })),
    { url: absoluteUrl("/about/"), lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];
}

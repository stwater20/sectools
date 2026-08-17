import type { MetadataRoute } from "next";
import { toolCatalog } from "@/lib/tool-catalog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tools.sectools.tw";
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    ...toolCatalog.map((tool) => ({
      url: `${siteUrl}/tools/${tool.slug}/`,
      changeFrequency: "monthly" as const,
      priority: tool.featured ? 0.8 : 0.7,
    })),
  ];
}

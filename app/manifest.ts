import type { MetadataRoute } from "next";
import { siteName, siteShortName } from "@/lib/site";
import { toolCatalog } from "@/lib/tool-catalog";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteShortName,
    description: `${toolCatalog.length} 個免費線上資安工具，資料只在瀏覽器本機運算。`,
    lang: "zh-Hant-TW",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#fbfaf7",
    categories: ["security", "developer", "utilities"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

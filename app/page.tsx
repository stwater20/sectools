import { HomeClient } from "@/components/home-client";
import { toolCatalog } from "@/lib/tool-catalog";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SecTools.tw Toolkit",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tools.sectools.tw",
    inLanguage: "zh-Hant-TW",
    description: "隱私優先、完全在瀏覽器本機運算的免費資安工具箱。",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeClient tools={toolCatalog} />
    </>
  );
}

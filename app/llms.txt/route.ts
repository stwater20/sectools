import { localizedCategories, localizedTools } from "@/lib/content";
import { guides } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

// A plain-text site summary for AI assistants and LLM-based search (https://llmstxt.org).
export function GET() {
  const tools = localizedTools("en");
  const zhTools = localizedTools("zh");
  const sections = localizedCategories("en").map((category) => {
    const lines = tools.filter((tool) => tool.category.slug === category.slug).map((tool) => {
      const zh = zhTools.find((item) => item.slug === tool.slug)!;
      return `- [${tool.name}](${absoluteUrl(`/en/${tool.slug}/`)}): ${tool.description} (中文：[${zh.name}](${absoluteUrl(`/${tool.slug}/`)}))`;
    });
    return `## ${category.title}\n\n${lines.join("\n")}`;
  });
  const body = `# SecTools Security Toolkit (SecTools 資安工具箱)

> ${tools.length} free online security and CTF tools that run entirely in the browser. No sign-up, no ads, no tracking, and no input is ever sent to a server. Available in English (${absoluteUrl("/en/")}) and Traditional Chinese (${absoluteUrl("/")}).

Every tool page includes the interactive tool, a how-to guide, use cases and an FAQ. Source code: https://github.com/stwater20/sectools

${sections.join("\n\n")}

## Guides

${guides.map((guide) => `- [${guide.en.title}](${absoluteUrl(`/en/guides/${guide.slug}/`)}): ${guide.en.description} (中文：[${guide.zh.title}](${absoluteUrl(`/guides/${guide.slug}/`)}))`).join("\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

import type { LocalizedTool } from "./content";

export type ToolSummary = { slug: string; name: string; englishName: string; description: string; category: string; icon: string; tags: string[]; status?: "new" | "popular" };

/** Compact, serializable tool data for client components. `englishName` holds the other language's name. */
export function toSummary(tool: LocalizedTool): ToolSummary {
  const summary: ToolSummary = { slug: tool.slug, name: tool.name, englishName: tool.altName, description: tool.description, category: tool.category.name, icon: tool.icon, tags: tool.tags };
  if (tool.status) summary.status = tool.status;
  return summary;
}

function normalizeSearch(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-Hant-TW");
}

export function searchTools<T extends ToolSummary>(tools: T[], query: string): T[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return tools;
  return tools
    .map((tool, index) => {
      const name = normalizeSearch(`${tool.name} ${tool.englishName} ${tool.slug}`);
      const tags = normalizeSearch(tool.tags.join(" "));
      const rest = normalizeSearch(`${tool.description} ${tool.category}`);
      let score = 0;
      for (const token of tokens) {
        if (name.startsWith(token)) score += 12;
        else if (name.includes(token)) score += 8;
        else if (tags.includes(token)) score += 5;
        else if (rest.includes(token)) score += 2;
        else return null;
      }
      return { tool, score, index };
    })
    .filter((item): item is { tool: T; score: number; index: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.tool);
}

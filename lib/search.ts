import type { ToolDefinition } from "./tool-catalog";

export type ToolSummary = Pick<ToolDefinition, "slug" | "name" | "englishName" | "description" | "category" | "icon" | "tags" | "status">;

export function toSummary({ slug, name, englishName, description, category, icon, tags, status }: ToolDefinition): ToolSummary {
  return status ? { slug, name, englishName, description, category, icon, tags, status } : { slug, name, englishName, description, category, icon, tags };
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

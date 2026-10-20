import { categoriesEn, toolsEn } from "./content-en";
import type { Locale } from "./i18n";
import { categories, relatedTools, toolCatalog, type CategoryDefinition, type ToolDefinition } from "./tool-catalog";

export type LocalizedCategory = Omit<CategoryDefinition, "name"> & { key: CategoryDefinition["name"]; name: string };
export type LocalizedTool = Pick<ToolDefinition, "slug" | "icon" | "tags" | "status" | "featured"> & {
  name: string;
  /** The other language's name, shown as a subtitle. */
  altName: string;
  description: string;
  category: LocalizedCategory;
  guide: NonNullable<ToolDefinition["guide"]>;
};

export function localizeCategory(category: CategoryDefinition, locale: Locale): LocalizedCategory {
  if (locale === "zh") return { ...category, key: category.name };
  const en = categoriesEn[category.slug];
  return { ...category, ...en, key: category.name };
}

export function localizedCategories(locale: Locale) {
  return categories.map((category) => localizeCategory(category, locale));
}

export function localizeTool(tool: ToolDefinition, locale: Locale): LocalizedTool {
  const category = localizeCategory(categories.find((item) => item.name === tool.category)!, locale);
  const base = { slug: tool.slug, icon: tool.icon, tags: tool.tags, status: tool.status, featured: tool.featured, category };
  if (locale === "en") {
    const en = toolsEn[tool.slug];
    return { ...base, name: tool.englishName, altName: tool.name, description: en.description, guide: { intro: en.intro, steps: en.steps, useCases: en.useCases } };
  }
  const guide = tool.guide ?? {
    intro: `${tool.description}${tool.name}（${tool.englishName}）完全在瀏覽器內執行，適合處理不方便貼到第三方網站的資料。`,
    steps: ["把要分析的內容貼到上方工作區；若含正式環境的憑證或個資，建議先遮蔽。", "依需要調整格式或參數，再執行工具。", "確認結果後複製使用；正式結論請再與原始證據或其他工具交叉比對。"] as [string, string, string],
    useCases: [category.useCase, `處理 ${tool.tags.slice(0, 3).join("、")} 相關資料。`, "在不能使用外部服務的環境（例如事件調查期間）快速完成初步分析。"] as [string, string, string],
  };
  return { ...base, name: tool.name, altName: tool.englishName, description: tool.description, guide };
}

export function localizedTools(locale: Locale) {
  return toolCatalog.map((tool) => localizeTool(tool, locale));
}

export function localizedRelated(tool: ToolDefinition, locale: Locale, limit = 6) {
  return relatedTools(tool, limit).map((item) => localizeTool(item, locale));
}

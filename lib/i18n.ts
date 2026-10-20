export type Locale = "zh" | "en";

export const htmlLang: Record<Locale, string> = { zh: "zh-Hant-TW", en: "en" };
export const ogLocale: Record<Locale, string> = { zh: "zh_TW", en: "en_US" };

/** Prefix a site path for the given locale. Chinese stays at the root; English lives under /en. */
export function localePath(locale: Locale, path = "/") {
  return locale === "en" ? `/en${path === "/" ? "/" : path}` : path;
}

/** hreflang alternates for a root-relative path that exists in both languages. */
export function languageAlternates(path: string) {
  return { "zh-Hant-TW": path, en: localePath("en", path), "x-default": path };
}

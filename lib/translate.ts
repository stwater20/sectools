import type { Locale } from "./i18n.ts";
import { enDictionary, enPatterns } from "./i18n-en.ts";

function fill(text: string, args: Array<string | number>) {
  return args.length ? text.replace(/\{(\d+)\}/g, (match, index) => (args[Number(index)] ?? match).toString()) : text;
}

/** Translate Chinese UI or library text. Unknown strings fall back to the original so nothing disappears. */
export function translate(locale: Locale, text: string, args: Array<string | number> = []) {
  if (locale === "zh" || !text) return fill(text, args);
  const trimmed = text.trim();
  const exact = enDictionary[trimmed];
  if (exact !== undefined) return fill(text.replace(trimmed, exact), args);
  for (const [pattern, replace] of enPatterns) {
    const match = trimmed.match(pattern);
    if (match) return fill(replace(...match.slice(1)), args);
  }
  return fill(text, args);
}

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tools.sectools.tw").replace(/\/$/, "");
export const siteName = "SecTools.tw Toolkit";
export const siteShortName = "SecTools";
export const siteLocale = "zh-Hant-TW";

export function absoluteUrl(path = "/") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

"use client";

import { createContext, useCallback, useContext } from "react";
import { translate } from "@/lib/translate";
import type { Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("zh");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Returns t(text, ...args): Chinese source text in, the active locale's text out. {0}, {1}… are filled from args. */
export function useT() {
  const locale = useContext(LocaleContext);
  return useCallback((text: string, ...args: Array<string | number>) => translate(locale, text, args), [locale]);
}

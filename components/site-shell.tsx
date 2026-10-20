import Link from "next/link";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { localizedCategories, localizedTools } from "@/lib/content";
import { localePath, type Locale } from "@/lib/i18n";
import { toSummary } from "@/lib/search";
import { format, ui } from "@/lib/ui";

export function Brand({ locale = "zh" }: { locale?: Locale }) {
  const strings = ui[locale];
  return (
    <Link className="brand" href={localePath(locale, "/")} aria-label={strings.homeLabel}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="4 8 56 44"><path className="arch-main" d="M17 39V29c0-8 6-14 14-14s14 6 14 14v10" /><path className="arch-side" d="M9 40V34c0-5 4-9 9-9M55 40v-6c0-5-4-9-9-9" /><path className="arch-base" d="M10 47h44" /></svg>
      </span>
      <span className="brand-copy">
        <strong>SecTools</strong>
        <small>{strings.brandSub}</small>
      </span>
    </Link>
  );
}

/** `path` is the current page's locale-neutral path (e.g. "/jwt-decoder/"), used for the language switch. */
export function SiteHeader({ compact = false, locale = "zh", path = "/" }: { compact?: boolean; locale?: Locale; path?: string }) {
  const strings = ui[locale];
  const other: Locale = locale === "zh" ? "en" : "zh";
  const tools = localizedTools(locale).map(toSummary);
  return (
    <>
      <a className="skip-link" href="#main">{strings.skip}</a>
      <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
        <div className="site-header__inner">
          <Brand locale={locale} />
          <nav aria-label={locale === "zh" ? "主要導覽" : "Main"}>
            <Link href={`${localePath(locale, "/")}#tools`}>{strings.navTools}</Link>
            <Link href={`${localePath(locale, "/")}#categories`}>{strings.navCategories}</Link>
            <Link href={localePath(locale, "/about/")}>{strings.navAbout}</Link>
          </nav>
          <div className="site-header__actions">
            <CommandPalette tools={tools} locale={locale} strings={{ label: strings.searchLabel, short: strings.searchShort, placeholder: strings.searchPlaceholder, recent: strings.searchRecent, empty: strings.searchEmpty, results: strings.searchResults, select: strings.searchSelect, open: strings.searchOpen, close: strings.searchClose, favorited: strings.favorited }} />
            <a className="lang-switch" href={localePath(other, path)} hrefLang={other === "en" ? "en" : "zh-Hant-TW"} lang={other === "en" ? "en" : "zh-Hant-TW"} aria-label={strings.switchLanguageLabel}>{strings.switchLanguage}</a>
            <ThemeToggle label={strings.themeToggle} />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ locale = "zh" }: { locale?: Locale }) {
  const strings = ui[locale];
  const tools = localizedTools(locale);
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__intro">
          <Brand locale={locale} />
          <p>{format(strings.footerIntro, tools.length)}</p>
          <Link className="site-footer__about" href={localePath(locale, "/about/")}>{strings.footerAbout}</Link>
        </div>
        <nav className="site-footer__nav" aria-label={strings.footerNav}>
          {localizedCategories(locale).map((category) => (
            <div key={category.slug}>
              <Link className="site-footer__heading" href={localePath(locale, `/categories/${category.slug}/`)}>{category.name}</Link>
              <ul>
                {tools.filter((tool) => tool.category.slug === category.slug).map((tool) => (
                  <li key={tool.slug}><Link href={localePath(locale, `/${tool.slug}/`)}>{tool.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="site-footer__legal">
          <span>© {new Date().getFullYear()} SecTools.tw</span>
          <span>{strings.footerLocal}</span>
          <a href="https://sectools.tw/" rel="noreferrer">{strings.footerMain}</a>
          <a href="https://github.com/stwater20/sectools" rel="noreferrer">{strings.footerSource}</a>
          <a href={localePath("zh", "/")} hrefLang="zh-Hant-TW" lang="zh-Hant-TW">繁體中文</a>
          <a href={localePath("en", "/")} hrefLang="en" lang="en">English</a>
        </p>
      </div>
    </footer>
  );
}

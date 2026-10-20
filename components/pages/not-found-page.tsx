import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { localizedCategories } from "@/lib/content";
import { localePath, type Locale } from "@/lib/i18n";
import { ui } from "@/lib/ui";

export function NotFoundPage({ locale }: { locale: Locale }) {
  const strings = ui[locale];
  return (
    <div className="page-shell">
      <SiteHeader compact locale={locale} />
      <main id="main" className="container not-found">
        <div className="empty-state">
          <span aria-hidden="true">404</span>
          <h1>{strings.notFoundTitle}</h1>
          <p>{strings.notFoundBody}</p>
          <div className="not-found__links">
            <Link className="primary-button" href={localePath(locale, "/")}>{strings.notFoundHome}</Link>
            {localizedCategories(locale).map((category) => <Link key={category.slug} className="ghost-button" href={localePath(locale, `/categories/${category.slug}/`)}>{category.name}</Link>)}
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

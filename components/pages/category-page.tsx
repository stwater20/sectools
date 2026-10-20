import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { localizeCategory, localizedCategories, localizedTools } from "@/lib/content";
import { htmlLang, languageAlternates, localePath, ogLocale, type Locale } from "@/lib/i18n";
import { absoluteUrl, jsonLd, siteName } from "@/lib/site";
import { findCategory } from "@/lib/tool-catalog";
import { format, ui } from "@/lib/ui";

export function categoryMetadata(slug: string, locale: Locale): Metadata {
  const source = findCategory(slug);
  if (!source) return {};
  const category = localizeCategory(source, locale);
  const count = localizedTools(locale).filter((tool) => tool.category.slug === slug).length;
  const path = `/categories/${slug}/`;
  const title = locale === "en" ? `${category.title} — ${count} Free Online Tools` : `${category.title}｜${count} 個免費線上工具`;
  const description = locale === "en" ? `${category.summary} All free, no sign-up, and processed locally in your browser.` : `${category.summary}全部免費、免註冊，資料只在瀏覽器本機處理。`;
  const brand = locale === "en" ? "SecTools Security Toolkit" : siteName;
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title,
    description,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
    openGraph: { type: "website", locale: ogLocale[locale], siteName: brand, title: `${title}｜${brand}`, description: category.summary, url: localePath(locale, path), images: [{ url: image, width: 1200, height: 630, alt: `${category.title}｜${brand}` }] },
  };
}

export function CategoryPage({ slug, locale }: { slug: string; locale: Locale }) {
  const source = findCategory(slug);
  if (!source) notFound();
  const strings = ui[locale];
  const category = localizeCategory(source, locale);
  const allTools = localizedTools(locale);
  const tools = allTools.filter((tool) => tool.category.slug === slug);
  const others = localizedCategories(locale).filter((item) => item.slug !== slug);
  const pageUrl = absoluteUrl(localePath(locale, `/categories/${slug}/`));
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", name: category.title, description: category.summary, url: pageUrl, inLanguage: htmlLang[locale],
      mainEntity: { "@type": "ItemList", numberOfItems: tools.length, itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteUrl(localePath(locale, `/${tool.slug}/`)) })) },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: strings.breadcrumbHome, item: absoluteUrl(localePath(locale, "/")) },
        { "@type": "ListItem", position: 2, name: category.name, item: pageUrl },
      ],
    },
  ];
  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact locale={locale} path={`/categories/${slug}/`} />
      <main id="main">
        <section className="tool-hero category-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"}>
              <Link href={localePath(locale, "/")}>{strings.breadcrumbHome}</Link><span aria-hidden="true">/</span><strong aria-current="page">{category.name}</strong>
            </nav>
            <span className="section-kicker">{category.label} · {tools.length} TOOLS</span>
            <h1>{category.title}</h1>
            <p className="category-hero__lead">{category.intro}</p>
          </div>
        </section>
        <section className="container category-tools" aria-label={category.title}>
          <ol className="category-list">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link href={localePath(locale, `/${tool.slug}/`)}>
                  <span className="category-list__icon" aria-hidden="true">{tool.icon}</span>
                  <span className="category-list__body"><strong>{tool.name}</strong>{locale === "zh" && <small>{tool.altName}</small>}<p>{tool.description}</p></span>
                  <b aria-hidden="true">→</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section className="container related-tools" aria-labelledby="other-categories">
          <div className="section-heading"><div><span className="section-kicker">MORE CATEGORIES</span><h2 id="other-categories">{strings.otherCategories}</h2></div></div>
          <div className="related-grid">
            {others.map((item) => (
              <Link key={item.slug} href={localePath(locale, `/categories/${item.slug}/`)}>
                <span aria-hidden="true">{allTools.filter((tool) => tool.category.slug === item.slug).length}</span>
                <div><strong>{item.name}</strong><small>{format(strings.toolsCount, allTools.filter((tool) => tool.category.slug === item.slug).length)}</small></div>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

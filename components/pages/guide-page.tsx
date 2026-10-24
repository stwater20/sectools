import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { localizedTools } from "@/lib/content";
import { findGuide, guides } from "@/lib/guides";
import { htmlLang, languageAlternates, localePath, ogLocale, type Locale } from "@/lib/i18n";
import { absoluteUrl, jsonLd, siteName } from "@/lib/site";
import { format, ui } from "@/lib/ui";

const brand = { zh: siteName, en: "SecTools Security Toolkit" };

/** Render `inline code` spans inside guide text. */
function rich(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, index) => (part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part));
}

const sectionId = (index: number) => `section-${index + 1}`;

export function guidesIndexMetadata(locale: Locale): Metadata {
  const strings = ui[locale];
  const path = "/guides/";
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title: strings.guidesTitle,
    description: strings.guidesDescription,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
    openGraph: { type: "website", locale: ogLocale[locale], siteName: brand[locale], title: `${strings.guidesTitle}｜${brand[locale]}`, description: strings.guidesDescription, url: localePath(locale, path), images: [{ url: image, width: 1200, height: 630 }] },
  };
}

export function GuidesIndexPage({ locale }: { locale: Locale }) {
  const strings = ui[locale];
  const pageUrl = absoluteUrl(localePath(locale, "/guides/"));
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", name: strings.guidesTitle, description: strings.guidesDescription, url: pageUrl, inLanguage: htmlLang[locale],
      mainEntity: { "@type": "ItemList", numberOfItems: guides.length, itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide[locale].title, url: absoluteUrl(localePath(locale, `/guides/${guide.slug}/`)) })) },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: strings.breadcrumbHome, item: absoluteUrl(localePath(locale, "/")) },
        { "@type": "ListItem", position: 2, name: strings.navGuides, item: pageUrl },
      ],
    },
  ];
  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact locale={locale} path="/guides/" />
      <main id="main">
        <section className="tool-hero category-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"}>
              <Link href={localePath(locale, "/")}>{strings.breadcrumbHome}</Link><span aria-hidden="true">/</span><strong aria-current="page">{strings.navGuides}</strong>
            </nav>
            <span className="section-kicker">GUIDES · {guides.length}</span>
            <h1>{strings.guidesTitle}</h1>
            <p className="category-hero__lead">{strings.guidesLead}</p>
          </div>
        </section>
        <section className="container category-tools" aria-label={strings.guidesTitle}>
          <ol className="category-list guide-list">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link href={localePath(locale, `/guides/${guide.slug}/`)}>
                  <span className="category-list__icon" aria-hidden="true">{guide.icon}</span>
                  <span className="category-list__body"><strong>{guide[locale].title}</strong><p>{guide[locale].description}</p></span>
                  <b aria-hidden="true">→</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

export function guideMetadata(slug: string, locale: Locale): Metadata {
  const guide = findGuide(slug);
  if (!guide) return {};
  const copy = guide[locale];
  const path = `/guides/${slug}/`;
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
    openGraph: {
      type: "article", locale: ogLocale[locale], siteName: brand[locale], title: copy.title, description: copy.description, url: localePath(locale, path),
      publishedTime: guide.published, modifiedTime: guide.updated, images: [{ url: image, width: 1200, height: 630, alt: copy.title }],
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description, images: [image] },
  };
}

export function GuidePage({ slug, locale }: { slug: string; locale: Locale }) {
  const guide = findGuide(slug);
  if (!guide) notFound();
  const strings = ui[locale];
  const copy = guide[locale];
  const tools = localizedTools(locale);
  const toolOf = (toolSlug: string) => tools.find((tool) => tool.slug === toolSlug);
  const pageUrl = absoluteUrl(localePath(locale, `/guides/${slug}/`));
  const others = guides.filter((item) => item.slug !== slug);
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "TechArticle", headline: copy.title, description: copy.description, inLanguage: htmlLang[locale], url: pageUrl,
      datePublished: guide.published, dateModified: guide.updated, image: absoluteUrl(locale === "en" ? "/og-en.jpg" : "/og.jpg"),
      author: { "@type": "Organization", name: "SecTools.tw", url: "https://sectools.tw/" },
      publisher: { "@type": "Organization", name: "SecTools.tw", url: "https://sectools.tw/", logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") } },
      mainEntityOfPage: pageUrl,
      about: guide.tools.map((toolSlug) => toolOf(toolSlug)).filter(Boolean).map((tool) => ({ "@type": "WebApplication", name: tool!.name, url: absoluteUrl(localePath(locale, `/${tool!.slug}/`)) })),
    },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: htmlLang[locale], mainEntity: copy.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: strings.breadcrumbHome, item: absoluteUrl(localePath(locale, "/")) },
        { "@type": "ListItem", position: 2, name: strings.navGuides, item: absoluteUrl(localePath(locale, "/guides/")) },
        { "@type": "ListItem", position: 3, name: copy.title, item: pageUrl },
      ],
    },
  ];
  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact locale={locale} path={`/guides/${slug}/`} />
      <main id="main">
        <section className="tool-hero category-hero guide-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"}>
              <Link href={localePath(locale, "/")}>{strings.breadcrumbHome}</Link><span aria-hidden="true">/</span>
              <Link href={localePath(locale, "/guides/")}>{strings.navGuides}</Link><span aria-hidden="true">/</span>
              <strong aria-current="page">{guide.icon}</strong>
            </nav>
            <span className="section-kicker">GUIDE · {format(strings.guideUpdated, guide.updated)}</span>
            <h1>{copy.title}</h1>
            <p className="category-hero__lead">{copy.lead}</p>
          </div>
        </section>
        <div className="container guide-layout">
          <aside className="guide-toc" aria-label={strings.guideToc}>
            <strong>{strings.guideToc}</strong>
            <ol>{copy.sections.map((section, index) => <li key={section.heading}><a href={`#${sectionId(index)}`}>{section.heading}</a></li>)}</ol>
          </aside>
          <article className="guide-article">
            {copy.sections.map((section, index) => (
              <section key={section.heading} id={sectionId(index)} aria-labelledby={`${sectionId(index)}-title`}>
                <h2 id={`${sectionId(index)}-title`}>{section.heading}</h2>
                {section.body.map((paragraph) => <p key={paragraph}>{rich(paragraph)}</p>)}
                {section.list && <ul>{section.list.map((item) => <li key={item}>{rich(item)}</li>)}</ul>}
                {section.tools && (
                  <div className="guide-tools">
                    {section.tools.map((toolSlug) => {
                      const tool = toolOf(toolSlug);
                      return tool && (
                        <Link key={toolSlug} href={localePath(locale, `/${toolSlug}/`)}>
                          <span aria-hidden="true">{tool.icon}</span>
                          <div><strong>{tool.name}</strong><small>{strings.guideOpenTool}</small></div>
                          <b aria-hidden="true">→</b>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
            <section className="tool-faq guide-faq" aria-labelledby="guide-faq">
              <span className="section-kicker">FAQ</span>
              <h2 id="guide-faq">{strings.guideFaq}</h2>
              {copy.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
            </section>
          </article>
        </div>
        <section className="container related-tools" aria-labelledby="more-guides">
          <div className="section-heading">
            <div><span className="section-kicker">KEEP READING</span><h2 id="more-guides">{strings.guideMore}</h2></div>
            <Link className="text-link" href={localePath(locale, "/guides/")}>{strings.guideAll}</Link>
          </div>
          <div className="related-grid">
            {others.slice(0, 6).map((item) => (
              <Link key={item.slug} href={localePath(locale, `/guides/${item.slug}/`)}>
                <span aria-hidden="true">{item.icon}</span>
                <div><strong>{item[locale].title}</strong></div>
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

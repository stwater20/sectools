import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/locale";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { ToolActions } from "@/components/tool-actions";
import { ToolWorkbench } from "@/components/tool-workbench";
import { localizeTool, localizedRelated } from "@/lib/content";
import { htmlLang, languageAlternates, localePath, ogLocale, type Locale } from "@/lib/i18n";
import { absoluteUrl, jsonLd, siteName } from "@/lib/site";
import { findTool } from "@/lib/tool-catalog";
import { format, ui } from "@/lib/ui";

const brand = { zh: siteName, en: "SecTools Security Toolkit" };

function faqsFor(name: string, locale: Locale) {
  if (locale === "en") {
    return [
      { question: `Does the ${name} upload my data?`, answer: "No. The tool makes no network requests; your input and results exist only in the current tab. Open the Network panel in DevTools to verify." },
      { question: `Is the ${name} free? Do I need an account?`, answer: `It's free with no account and no usage limits, like every other tool on SecTools.` },
      { question: `Can I use the ${name} on mobile or offline?`, answer: "Yes. It works in mobile and desktop browsers and keeps working offline once the page has loaded. You can also self-host the open-source code on an internal network." },
      { question: `Can I treat the ${name}'s results as a final verdict?`, answer: "Use them for triage and cross-checking. For important incidents, keep the original evidence and confirm with your formal verification or forensic process." },
    ];
  }
  return [
    { question: `${name}會上傳我的資料嗎？`, answer: "不會。工具不會發出任何網路請求，輸入與結果只存在目前的分頁。打開開發者工具的 Network 面板，就能自己確認。" },
    { question: `${name}要付費或註冊嗎？`, answer: `都不用。${name}和 SecTools 資安工具箱裡的其他工具一樣，免費、免帳號，也沒有次數限制。` },
    { question: `手機或離線環境可以用${name}嗎？`, answer: "可以。手機與電腦瀏覽器都能使用，頁面載入後斷網也能繼續運算。需要在內網使用，也可以從 GitHub 取得原始碼自行部署。" },
    { question: `${name}的結果可以直接當作正式判定嗎？`, answer: "建議當作初步分析與交叉比對使用。重要事件請保留原始證據，並以正式的驗證或鑑識流程確認。" },
  ];
}

export function toolMetadata(slug: string, locale: Locale): Metadata {
  const source = findTool(slug);
  if (!source) return {};
  const tool = localizeTool(source, locale);
  const path = `/${slug}/`;
  const url = localePath(locale, path);
  const title = locale === "en" ? `${tool.name} — Free Online Tool` : `${tool.name}｜線上 ${tool.altName}`;
  const description = locale === "en" ? `${tool.description} Free, no sign-up, and your data stays in your browser.` : `${tool.description}免費、免註冊，資料只在你的瀏覽器處理，不會上傳。`;
  const keywords = locale === "en"
    ? [tool.name, `${tool.name} online`, `free ${tool.name.toLowerCase()}`, tool.category.name, ...tool.tags]
    : [tool.name, tool.altName, tool.category.name, ...tool.tags, `${tool.name} 線上工具`, `${tool.altName} online`, `${tool.name} 免費`, "繁體中文資安工具"];
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title,
    description,
    keywords: [...new Set(keywords)],
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: { type: "website", locale: ogLocale[locale], siteName: brand[locale], title: `${title}｜${brand[locale]}`, description, url, images: [{ url: image, width: 1200, height: 630, alt: `${tool.name}｜${brand[locale]}` }] },
    twitter: { card: "summary_large_image", title: `${tool.name}｜${brand[locale]}`, description, images: [image] },
  };
}

export function ToolPage({ slug, locale }: { slug: string; locale: Locale }) {
  const source = findTool(slug);
  if (!source) notFound();
  const strings = ui[locale];
  const tool = localizeTool(source, locale);
  const { category, guide } = tool;
  const related = localizedRelated(source, locale, 6);
  const faqs = faqsFor(tool.name, locale);
  const pageUrl = absoluteUrl(localePath(locale, `/${tool.slug}/`));
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, alternateName: tool.altName, url: pageUrl,
      applicationCategory: "SecurityApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript", inLanguage: htmlLang[locale],
      isAccessibleForFree: true, featureList: tool.tags, description: tool.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: locale === "en" ? "USD" : "TWD" },
      publisher: { "@type": "Organization", name: "SecTools.tw", url: "https://sectools.tw/" },
    },
    {
      "@context": "https://schema.org", "@type": "HowTo", name: format(strings.howTo, tool.name), inLanguage: htmlLang[locale],
      step: guide.steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, text: step })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: strings.breadcrumbHome, item: absoluteUrl(localePath(locale, "/")) },
        { "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(localePath(locale, `/categories/${category.slug}/`)) },
        { "@type": "ListItem", position: 3, name: tool.name, item: pageUrl },
      ],
    },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: htmlLang[locale], mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
  ];

  return (
    <div className="page-shell tool-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact locale={locale} path={`/${tool.slug}/`} />
      <main id="main">
        <section className="tool-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"}>
              <Link href={localePath(locale, "/")}>{strings.breadcrumbHome}</Link><span aria-hidden="true">/</span>
              <Link href={localePath(locale, `/categories/${category.slug}/`)}>{category.name}</Link><span aria-hidden="true">/</span>
              <strong aria-current="page">{tool.name}</strong>
            </nav>
            <div className="tool-hero__title">
              <span className="tool-hero__icon" aria-hidden="true">{tool.icon}</span>
              <div>
                <span className="section-kicker">{(locale === "en" ? category.name : tool.altName).toUpperCase()}</span>
                <h1>{tool.name}</h1>
                <p>{tool.description}</p>
              </div>
            </div>
            <div className="tool-hero__bar">
              <div className="local-badge"><i className="pulse-dot" /><strong>{strings.localBadge}</strong><span>{strings.localBadgeDetail}</span></div>
              <ToolActions slug={tool.slug} name={tool.name} strings={{ favorite: strings.favorite, favorited: strings.favorited, share: strings.shareLink, copied: strings.copiedLink }} />
            </div>
          </div>
        </section>
        <section className="container workbench-wrap" aria-label={format(strings.workbenchLabel, tool.name)}>
          <div className="workbench-header"><span>WORKBENCH</span><p>{strings.workbenchMeta}</p></div>
          <div className="workbench"><LocaleProvider locale={locale}><ToolWorkbench slug={tool.slug} /></LocaleProvider></div>
        </section>
        <section className="container tool-guide">
          <div className="tool-guide__grid">
            <article>
              <span className="section-kicker">HOW TO USE</span>
              <h2>{format(strings.howTo, tool.name)}</h2>
              <p>{guide.intro}</p>
              <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </article>
            <article>
              <span className="section-kicker">USE CASES</span>
              <h2>{format(strings.useCases, tool.name)}</h2>
              <ul>{guide.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}</ul>
              <p className="search-terms">{strings.relatedTerms}{tool.tags.join(locale === "en" ? ", " : "、")}</p>
            </article>
          </div>
          <div className="tool-faq">
            <span className="section-kicker">FAQ</span>
            <h2>{format(strings.faqTitle, tool.name)}</h2>
            {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </div>
        </section>
        <section className="container tool-notes">
          <div><span className="section-kicker">SECURITY NOTE</span><h2>{strings.securityTitle}</h2></div>
          <p>{strings.securityBody}</p>
        </section>
        <section className="container related-tools" aria-labelledby="related-title">
          <div className="section-heading">
            <div><span className="section-kicker">KEEP WORKING</span><h2 id="related-title">{strings.relatedTitle}</h2></div>
            <Link className="text-link" href={localePath(locale, `/categories/${category.slug}/`)}>{format(strings.viewCategory, category.name)}</Link>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <Link key={item.slug} href={localePath(locale, `/${item.slug}/`)}>
                <span aria-hidden="true">{item.icon}</span>
                <div><strong>{item.name}</strong><small>{locale === "en" ? item.category.name : item.altName}</small></div>
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

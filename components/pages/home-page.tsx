import type { Metadata } from "next";
import Link from "next/link";
import { HomeClient } from "@/components/home-client";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { localizedCategories, localizedTools } from "@/lib/content";
import { htmlLang, languageAlternates, localePath, ogLocale, type Locale } from "@/lib/i18n";
import { toSummary } from "@/lib/search";
import { absoluteUrl, jsonLd, siteName, siteUrl } from "@/lib/site";
import { toolCatalog } from "@/lib/tool-catalog";

const count = toolCatalog.length;

const copy = {
  zh: {
    title: `${siteName}｜免費線上 JWT、Hash、CIDR、CVSS 與 CTF 工具`,
    description: `${count} 個免費線上資安工具：JWT 解碼與驗簽、Hash／HMAC、CIDR 與 IPv6 計算、CVSS 評分、IOC 擷取、PCAP 分析、RSA 與 CTF 解題。免註冊、無廣告，資料全程在瀏覽器處理，不會上傳。`,
    shareTitle: `${siteName}｜${count} 個免費線上資安工具`,
    shareDescription: "JWT 解碼、Hash、CIDR、CVSS、IOC、PCAP 與 CTF 工具一次收齊。免註冊、無廣告，貼上的內容只在你的電腦上運算。",
    siteDescription: "免費線上資安工具箱，所有運算都在瀏覽器本機完成，資料不會上傳。",
    listName: `${siteName}：線上資安工具清單`,
    featuresTitle: "敏感資料，留在你的電腦裡。",
    featuresLead: "多數線上工具會把你貼上的內容送到伺服器處理。SecTools 不這麼做：所有運算都由瀏覽器內建的 JavaScript 與 Web Crypto API 完成。",
    features: [
      ["100% 本機運算", "沒有後端、沒有 API。打開開發者工具的 Network 面板，貼上資料再執行，你會看到沒有任何請求被送出。"],
      ["沒有追蹤、沒有廣告", "不載入分析腳本、廣告聯播網或第三方字型。我們不知道你用了哪個工具，也不想知道。"],
      ["免註冊，打開就用", "不需要帳號，也沒有次數限制。收藏與最近使用只記工具名稱，存在你的瀏覽器。"],
      ["開源，可部署到內網", "原始碼公開在 GitHub，可以逐行稽核，也能建置成靜態網站，放在完全隔離的環境使用。"],
      ["斷網也能用", "工具頁載入後即可離線運算，事件調查、機房或飛機上都不受影響。"],
      ["手機、深色模式都好用", "介面針對手機重新排版，也支援深色模式，在值班時用手機查一下也很順手。"],
    ],
    categoriesTitle: "依工作情境挑工具",
    categoriesLead: "事件調查、網路設定、身分驗證、數位鑑識到 CTF，每個分類收錄該情境最常用的工具。",
    toolsCount: "{0} 個工具",
    faqTitle: "常見問題",
    faqs: [
      ["要付費或註冊嗎？", `都不用。${count} 個工具全部免費，不需要帳號，也沒有廣告與次數限制。`],
      ["貼上的 JWT、密碼或日誌會被上傳嗎？", "不會。運算全部在你的瀏覽器裡完成，工具不會發出任何網路請求。打開開發者工具的 Network 面板，就能自己確認。"],
      ["可以離線或在內網使用嗎？", "可以。工具頁面載入後，斷網也能繼續運算。原始碼公開在 GitHub，也可以自行建置成靜態網站，部署到公司內網。"],
      ["結果可以直接寫進正式報告嗎？", "建議當作初步分析與交叉比對使用。重要事件請保留原始證據，並以正式的驗證或鑑識流程確認。"],
    ],
    ctaTitle: ["下一次貼上 Token 之前，", "先打開 SecTools。"],
    ctaBodyA: "收藏這個網站，或在任何頁面按",
    ctaBodyB: "直接找工具。",
    ctaPrimary: "瀏覽全部工具",
    ctaSecondary: "試試 JWT 解碼器 →",
    keywords: ["資安工具", "線上資安工具", "CTF 工具", "JWT 解碼", "雜湊產生器", "CIDR 計算", "CVSS 計算", "RSA 解密", "隱寫術", "cybersecurity tools"],
  },
  en: {
    title: `SecTools Security Toolkit | Free Online JWT, Hash, CIDR, CVSS & CTF Tools`,
    description: `${count} free online security tools: JWT decoding and verification, hashes and HMAC, CIDR and IPv6 math, CVSS scoring, IOC extraction, PCAP analysis, an RSA solver and CTF crackers. No sign-up, no ads — everything runs in your browser.`,
    shareTitle: `SecTools | ${count} free online security tools`,
    shareDescription: "JWT, hashing, CIDR, CVSS, IOC, PCAP and CTF tools in one place. No sign-up, no ads, and your input never leaves your computer.",
    siteDescription: "A free online security toolkit where every tool runs locally in your browser.",
    listName: "SecTools: online security tools",
    featuresTitle: "Sensitive data stays on your computer.",
    featuresLead: "Most online tools send what you paste to a server. SecTools doesn't: every calculation runs with your browser's own JavaScript and Web Crypto API.",
    features: [
      ["100% local processing", "No backend, no API. Open the Network panel in DevTools, run a tool, and watch: no request is sent."],
      ["No tracking, no ads", "No analytics scripts, ad networks or third-party fonts. We don't know which tools you use, and we don't want to."],
      ["No sign-up needed", "No account and no usage limits. Favorites and recent tools are stored as tool names in your browser only."],
      ["Open source and self-hostable", "The source is on GitHub for line-by-line review, and builds to a static site you can host on an isolated network."],
      ["Works offline", "Once a tool page loads it keeps working without a connection — in the server room, on a plane or mid-incident."],
      ["Mobile and dark mode", "A layout designed for phones and a full dark theme, so a quick check while on call is easy."],
    ],
    categoriesTitle: "Find tools by workflow",
    categoriesLead: "Incident response, networking, authentication, forensics and CTFs — each category gathers the tools you need for that job.",
    toolsCount: "{0} tools",
    faqTitle: "FAQ",
    faqs: [
      ["Is it free? Do I need an account?", `Neither. All ${count} tools are free, need no account, and have no ads or usage limits.`],
      ["Are the JWTs, passwords or logs I paste uploaded?", "No. Everything runs in your browser and the tools make no network requests. Open the Network panel in DevTools to check for yourself."],
      ["Can I use it offline or on an internal network?", "Yes. Once a tool page loads it works offline. The source is on GitHub, so you can also build it as a static site and host it internally."],
      ["Can I put the results straight into a formal report?", "Use them for triage and cross-checking. For important incidents, keep the original evidence and confirm with your formal verification or forensic process."],
    ],
    ctaTitle: ["Before you paste your next token,", "open SecTools."],
    ctaBodyA: "Bookmark this site, or press",
    ctaBodyB: "on any page to find a tool.",
    ctaPrimary: "Browse all tools",
    ctaSecondary: "Try the JWT Decoder →",
    keywords: ["security tools", "online security tools", "CTF tools", "JWT decoder", "hash generator", "CIDR calculator", "CVSS calculator", "RSA CTF solver", "steganography tool", "CyberChef alternative"],
  },
} as const;

const featureIcons = [
  <svg key="0" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z" /><path d="m9 12 2 2 4-4" /></svg>,
  <svg key="1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></svg>,
  <svg key="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 4v16M4 9h5" /></svg>,
  <svg key="3" viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></svg>,
  <svg key="4" viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6Z" /></svg>,
  <svg key="5" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></svg>,
];

export function homeMetadata(locale: Locale): Metadata {
  const text = copy[locale];
  const url = localePath(locale, "/");
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title: { absolute: text.title },
    description: text.description,
    keywords: [...text.keywords],
    alternates: { canonical: url, languages: languageAlternates("/") },
    openGraph: { type: "website", locale: ogLocale[locale], siteName: locale === "en" ? "SecTools Security Toolkit" : siteName, title: text.shareTitle, description: text.shareDescription, url, images: [{ url: image, width: 1200, height: 630, alt: text.shareTitle }] },
    twitter: { card: "summary_large_image", title: text.shareTitle, description: text.shareDescription, images: [image] },
  };
}

export function HomePage({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const tools = localizedTools(locale);
  const categories = localizedCategories(locale);
  const home = absoluteUrl(localePath(locale, "/"));
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${home}#website`,
      name: locale === "en" ? "SecTools Security Toolkit" : siteName,
      alternateName: ["SecTools", "SecTools.tw", locale === "en" ? "SecTools 資安工具箱" : "SecTools Security Toolkit"],
      url: home,
      inLanguage: htmlLang[locale],
      description: text.siteDescription,
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${home}?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
    { "@context": "https://schema.org", "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "SecTools.tw", url: "https://sectools.tw/", logo: absoluteUrl("/icon-512.png"), sameAs: ["https://github.com/stwater20/sectools"] },
    {
      "@context": "https://schema.org", "@type": "ItemList", name: text.listName, numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteUrl(localePath(locale, `/${tool.slug}/`)) })),
    },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: htmlLang[locale], mainEntity: text.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ];

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader locale={locale} path="/" />
      <main id="main">
        <HomeClient tools={tools.map(toSummary)} categories={categories.map(({ name, slug }) => ({ name, slug }))} locale={locale} />

        <section className="features" id="privacy" aria-labelledby="features-title">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">WHY SECTOOLS</span>
              <h2 id="features-title">{text.featuresTitle}</h2>
              <p>{text.featuresLead}</p>
            </div>
            <div className="bento">
              <article className="bento__card bento__card--hero">
                <div>
                  <span className="bento__icon" aria-hidden="true">{featureIcons[0]}</span>
                  <h3>{text.features[0][0]}</h3>
                  <p>{text.features[0][1]}</p>
                </div>
                <div className="network-mock" aria-hidden="true">
                  <div className="network-mock__head"><span>Network</span><span>Fetch/XHR</span><span>WS</span></div>
                  <div className="network-mock__row network-mock__row--muted"><span>Name</span><span>Status</span><span>Size</span></div>
                  <div className="network-mock__empty"><strong>0</strong><span>requests · 0 B transferred</span></div>
                </div>
              </article>
              {text.features.slice(1).map(([title, body], index) => (
                <article key={title} className="bento__card">
                  <span className="bento__icon" aria-hidden="true">{featureIcons[index + 1]}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="category-section" id="categories" aria-labelledby="categories-title">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">CATEGORIES</span>
              <h2 id="categories-title">{text.categoriesTitle}</h2>
              <p>{text.categoriesLead}</p>
            </div>
            <div className="category-grid">
              {categories.map((category) => {
                const items = tools.filter((tool) => tool.category.slug === category.slug);
                return (
                  <Link key={category.slug} className="category-card" href={localePath(locale, `/categories/${category.slug}/`)}>
                    <span className="category-card__chips" aria-hidden="true">{items.slice(0, 4).map((tool) => <span key={tool.slug}>{tool.icon}</span>)}</span>
                    <h3>{category.name}</h3>
                    <p>{category.summary}</p>
                    <span className="category-card__foot"><strong>{text.toolsCount.replace("{0}", String(items.length))}</strong><b aria-hidden="true">→</b></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container home-faq" aria-labelledby="home-faq-title">
          <div className="section-heading section-heading--center">
            <span className="section-kicker">FAQ</span>
            <h2 id="home-faq-title">{text.faqTitle}</h2>
          </div>
          <div className="home-faq__list">
            {text.faqs.map(([question, answer]) => (
              <details key={question}><summary>{question}</summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        <section className="container cta" aria-labelledby="cta-title">
          <div className="cta__card">
            <div className="hero__glow" aria-hidden="true"><span /><span /><span /></div>
            <h2 id="cta-title">{text.ctaTitle[0]}<br />{text.ctaTitle[1]}</h2>
            <p>{text.ctaBodyA} <kbd>Ctrl</kbd> + <kbd>K</kbd> {text.ctaBodyB}</p>
            <div className="cta__actions">
              <Link className="button button--primary" href={`${localePath(locale, "/")}#tools`}>{text.ctaPrimary}</Link>
              <Link className="button button--ghost" href={localePath(locale, "/jwt-decoder/")}>{text.ctaSecondary}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

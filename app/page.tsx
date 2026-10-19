import { HomeClient } from "@/components/home-client";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { toSummary } from "@/lib/search";
import { absoluteUrl, jsonLd, siteLocale, siteName, siteUrl } from "@/lib/site";
import { categories, toolCatalog } from "@/lib/tool-catalog";
import Link from "next/link";

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      alternateName: ["SecTools", "SecTools.tw", "資安工具箱"],
      url: `${siteUrl}/`,
      inLanguage: siteLocale,
      description: "免費線上資安工具箱，所有運算都在瀏覽器本機完成，資料不會上傳。",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "SecTools.tw",
      url: "https://sectools.tw/",
      logo: absoluteUrl("/icon-512.png"),
      sameAs: ["https://github.com/stwater20/sectools"],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${siteName}：線上資安工具清單`,
      numberOfItems: toolCatalog.length,
      itemListElement: toolCatalog.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: absoluteUrl(`/${tool.slug}/`),
      })),
    },
  ];

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader />
      <main id="main">
        <HomeClient tools={toolCatalog.map(toSummary)} categories={categories.map(({ name, slug }) => ({ name, slug }))} />

        <section className="features" id="privacy" aria-labelledby="features-title">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">WHY SECTOOLS</span>
              <h2 id="features-title">敏感資料，留在你的電腦裡。</h2>
              <p>多數線上工具會把你貼上的內容送到伺服器處理。SecTools 不這麼做：所有運算都由瀏覽器內建的 JavaScript 與 Web Crypto API 完成。</p>
            </div>
            <div className="bento">
              <article className="bento__card bento__card--hero">
                <div>
                  <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z" /><path d="m9 12 2 2 4-4" /></svg></span>
                  <h3>100% 本機運算</h3>
                  <p>沒有後端、沒有 API。打開開發者工具的 Network 面板，貼上資料再執行，你會看到沒有任何請求被送出。</p>
                </div>
                <div className="network-mock" aria-hidden="true">
                  <div className="network-mock__head"><span>Network</span><span>Fetch/XHR</span><span>WS</span></div>
                  <div className="network-mock__row network-mock__row--muted"><span>Name</span><span>Status</span><span>Size</span></div>
                  <div className="network-mock__empty">
                    <strong>0</strong>
                    <span>requests · 0 B transferred</span>
                  </div>
                </div>
              </article>
              <article className="bento__card">
                <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></svg></span>
                <h3>沒有追蹤、沒有廣告</h3>
                <p>不載入分析腳本、廣告聯播網或第三方字型。我們不知道你用了哪個工具，也不想知道。</p>
              </article>
              <article className="bento__card">
                <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 4v16M4 9h5" /></svg></span>
                <h3>免註冊，打開就用</h3>
                <p>不需要帳號，也沒有次數限制。收藏與最近使用只記工具名稱，存在你的瀏覽器。</p>
              </article>
              <article className="bento__card">
                <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></svg></span>
                <h3>開源，可部署到內網</h3>
                <p>原始碼公開在 GitHub，可以逐行稽核，也能建置成靜態網站，放在完全隔離的環境使用。</p>
              </article>
              <article className="bento__card">
                <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6Z" /></svg></span>
                <h3>斷網也能用</h3>
                <p>工具頁載入後即可離線運算，事件調查、機房或飛機上都不受影響。</p>
              </article>
              <article className="bento__card">
                <span className="bento__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></svg></span>
                <h3>手機、深色模式都好用</h3>
                <p>介面針對手機重新排版，也支援深色模式，在值班時用手機查一下也很順手。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="category-section" id="categories" aria-labelledby="categories-title">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">CATEGORIES</span>
              <h2 id="categories-title">依工作情境挑工具</h2>
              <p>事件調查、網路設定、身分驗證、數位鑑識到 CTF，每個分類收錄該情境最常用的工具。</p>
            </div>
            <div className="category-grid">
              {categories.map((category) => {
                const items = toolCatalog.filter((tool) => tool.category === category.name);
                return (
                  <Link key={category.slug} className="category-card" href={`/categories/${category.slug}/`}>
                    <span className="category-card__chips" aria-hidden="true">
                      {items.slice(0, 4).map((tool) => <span key={tool.slug}>{tool.icon}</span>)}
                    </span>
                    <h3>{category.name}</h3>
                    <p>{category.summary}</p>
                    <span className="category-card__foot">
                      <strong>{items.length} 個工具</strong>
                      <b aria-hidden="true">→</b>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container home-faq" aria-labelledby="home-faq-title">
          <div className="section-heading section-heading--center">
            <span className="section-kicker">FAQ</span>
            <h2 id="home-faq-title">常見問題</h2>
          </div>
          <div className="home-faq__list">
            {homeFaqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: homeFaqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
            }) }}
          />
        </section>
        <section className="container cta" aria-labelledby="cta-title">
          <div className="cta__card">
            <div className="hero__glow" aria-hidden="true"><span /><span /><span /></div>
            <h2 id="cta-title">下一次貼上 Token 之前，<br />先打開 SecTools。</h2>
            <p>收藏這個網站，或在任何頁面按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 直接找工具。</p>
            <div className="cta__actions">
              <Link className="button button--primary" href="/#tools">瀏覽全部工具</Link>
              <Link className="button button--ghost" href="/jwt-decoder/">試試 JWT 解碼器 →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const homeFaqs = [
  { question: "要付費或註冊嗎？", answer: `都不用。${toolCatalog.length} 個工具全部免費，不需要帳號，也沒有廣告與次數限制。` },
  { question: "貼上的 JWT、密碼或日誌會被上傳嗎？", answer: "不會。運算全部在你的瀏覽器裡完成，工具不會發出任何網路請求。打開開發者工具的 Network 面板，就能自己確認。" },
  { question: "可以離線或在內網使用嗎？", answer: "可以。工具頁面載入後，斷網也能繼續運算。原始碼公開在 GitHub，也可以自行建置成靜態網站，部署到公司內網。" },
  { question: "結果可以直接寫進正式報告嗎？", answer: "建議當作初步分析與交叉比對使用。重要事件請保留原始證據，並以正式的驗證或鑑識流程確認。" },
];

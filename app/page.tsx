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
      alternateName: ["SecTools", "SecTools.tw 資安工具箱"],
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
      name: "SecTools.tw 線上資安工具",
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

        <section className="category-section" id="categories" aria-labelledby="categories-title">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">02 · CATEGORIES</span>
                <h2 id="categories-title">依工作情境挑工具</h2>
              </div>
              <p>事件調查、網路設定、身分驗證、數位鑑識到 CTF，每個分類收錄該情境最常用的工具。</p>
            </div>
            <div className="category-grid">
              {categories.map((category, index) => {
                const items = toolCatalog.filter((tool) => tool.category === category.name);
                return (
                  <Link key={category.slug} className="category-card" href={`/categories/${category.slug}/`}>
                    <span className="category-card__index">{String(index + 1).padStart(2, "0")} · {category.label}</span>
                    <h3>{category.name}</h3>
                    <p>{category.summary}</p>
                    <span className="category-card__chips" aria-hidden="true">
                      {items.slice(0, 4).map((tool) => <span key={tool.slug}>{tool.icon}</span>)}
                    </span>
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

        <section className="privacy-section" id="privacy">
          <div className="container privacy-grid">
            <div className="privacy-stamp" aria-hidden="true"><strong>LOCAL</strong><span>ONLY</span></div>
            <div>
              <span className="section-kicker">03 · PRIVACY</span>
              <h2>敏感資料，<br />留在你的電腦裡。</h2>
            </div>
            <div className="privacy-copy">
              <p>多數線上工具會把你貼上的內容送到伺服器處理。SecTools.tw 不這麼做：所有運算都由瀏覽器內建的 JavaScript 與 Web Crypto API 完成，沒有後端、沒有分析腳本，沒有人看得到你的輸入。</p>
              <ul>
                <li><span>01</span> 輸入與結果只存在目前分頁，關掉就消失</li>
                <li><span>02</span> 收藏與最近使用只記工具名稱，存在你的瀏覽器</li>
                <li><span>03</span> 原始碼公開，可以稽核，也能部署到內網</li>
              </ul>
              <Link className="text-link" href="/about/">閱讀完整隱私承諾 →</Link>
            </div>
          </div>
        </section>

        <section className="container home-faq" aria-labelledby="home-faq-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">04 · FAQ</span>
              <h2 id="home-faq-title">常見問題</h2>
            </div>
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

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
      description: "隱私優先、完全在瀏覽器本機運算的免費資安工具箱。",
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
                <span className="section-kicker">BY WORKFLOW / 02</span>
                <h2 id="categories-title">依工作情境找工具</h2>
              </div>
              <p>從事件調查到 CTF，每個分類都整理了最常用的工具組合。</p>
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
              <span className="section-kicker">PRIVACY BY DESIGN / 03</span>
              <h2>你的資料，<br />不該成為別人的資料。</h2>
            </div>
            <div className="privacy-copy">
              <p>工具使用瀏覽器原生能力完成運算；沒有 API 傳輸、沒有分析腳本，也沒有伺服器紀錄你的輸入。</p>
              <ul>
                <li><span>01</span> 輸入與結果只存在於目前分頁</li>
                <li><span>02</span> 收藏與最近使用僅存於本機</li>
                <li><span>03</span> 原始碼可稽核、可自行部署</li>
              </ul>
              <Link className="text-link" href="/about/">閱讀完整隱私承諾 →</Link>
            </div>
          </div>
        </section>

        <section className="container home-faq" aria-labelledby="home-faq-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FAQ / 04</span>
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
  { question: "SecTools.tw 的工具需要付費或註冊嗎？", answer: `不需要。全部 ${toolCatalog.length} 個工具免費使用、免登入，也沒有廣告或使用次數限制。` },
  { question: "我貼上的 JWT、密碼或日誌會被上傳嗎？", answer: "不會。所有運算都使用瀏覽器原生的 JavaScript 與 Web Crypto API 在本機完成，工具不會發出任何網路請求，你可以在開發者工具的 Network 面板自行驗證。" },
  { question: "可以離線或在內網環境使用嗎？", answer: "工具頁面載入後，即使中斷網路也能繼續操作該工具。原始碼公開於 GitHub，也可以自行建置靜態檔案部署到內網伺服器。" },
  { question: "工具結果可以直接作為正式報告的依據嗎？", answer: "工具適合快速分析與交叉核對。重要事件仍應保留原始證據，並以正式的驗證或鑑識流程確認結果。" },
];

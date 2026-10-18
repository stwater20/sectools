import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { categories, toolCatalog } from "@/lib/tool-catalog";

export const metadata: Metadata = {
  title: "關於 SecTools.tw 與隱私承諾",
  description: "SecTools.tw Toolkit 是開放原始碼、完全在瀏覽器本機運算的繁體中文資安工具箱。了解我們如何處理資料、本機儲存哪些設定，以及如何自行驗證。",
  alternates: { canonical: "/about/" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "SecTools.tw Toolkit",
    title: "關於 SecTools.tw 與隱私承諾",
    description: "開放原始碼、完全在瀏覽器本機運算的繁體中文資安工具箱：不上傳、不追蹤、可自行部署。",
    url: "/about/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "SecTools.tw 真正能用的資安工具箱" }],
  },
};

const principles = [
  { title: "工具輸入不離開瀏覽器", body: "所有雜湊、解碼、解析與計算都使用 JavaScript 與 Web Crypto API 在你的裝置上完成。工具程式碼不會呼叫 fetch、XHR 或 WebSocket，也沒有後端 API。" },
  { title: "沒有追蹤、沒有廣告", body: "網站原始碼不包含 Google Analytics、廣告聯播網、社群像素或第三方字型與 CDN。我們不知道你用了哪個工具，也不想知道。" },
  { title: "本機只存最少的偏好設定", body: "收藏、最近使用與深色模式設定存在你瀏覽器的 localStorage，只記錄工具代號（例如 jwt-decoder），從不保存你輸入的內容或結果。清除瀏覽器資料即可全部移除。" },
  { title: "原始碼公開、可自行部署", body: "完整原始碼公開於 GitHub，並以靜態檔案部署。你可以稽核每一行程式，也可以建置後放到公司內網，在完全隔離的環境中使用。" },
];

export default function AboutPage() {
  return (
    <div className="page-shell">
      <SiteHeader compact />
      <main id="main">
        <section className="tool-hero category-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label="麵包屑">
              <Link href="/">工具庫</Link><span aria-hidden="true">/</span><strong aria-current="page">關於與隱私</strong>
            </nav>
            <span className="section-kicker">ABOUT · PRIVACY</span>
            <h1>關於 SecTools.tw</h1>
            <p className="category-hero__lead">
              SecTools.tw Toolkit 是給資安工程師、SOC 分析師、開發者與 CTF 選手的免費工作台。我們相信處理 Token、日誌與惡意樣本時，
              最安全的做法是讓資料根本不離開你的電腦——所以 {toolCatalog.length} 個工具全部在瀏覽器本機執行。
            </p>
          </div>
        </section>
        <section className="container about-grid">
          {principles.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
        <section className="container about-verify">
          <div>
            <span className="section-kicker">VERIFY IT YOURSELF</span>
            <h2>不必相信我們，自己驗證</h2>
          </div>
          <ol>
            <li>開啟任一工具頁面，按 <kbd>F12</kbd> 打開瀏覽器開發者工具並切換到 Network 面板。</li>
            <li>貼上測試資料並執行工具，確認沒有新的網路請求被送出。</li>
            <li>或是中斷網路連線後再操作，工具依然可以正常運算。</li>
          </ol>
          <p>
            發現問題或想要新工具？歡迎到 <a className="text-link" href="https://github.com/stwater20/sectools" rel="noreferrer">GitHub</a> 回報或提出建議。
          </p>
        </section>
        <section className="container related-tools" aria-labelledby="about-categories">
          <div className="section-heading">
            <div><span className="section-kicker">START HERE</span><h2 id="about-categories">開始使用</h2></div>
          </div>
          <div className="related-grid">
            {categories.map((item) => (
              <Link key={item.slug} href={`/categories/${item.slug}/`}>
                <span aria-hidden="true">{toolCatalog.filter((tool) => tool.category === item.name).length}</span>
                <div><strong>{item.name}</strong><small>{item.label}</small></div>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

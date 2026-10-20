import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { localizedCategories, localizedTools } from "@/lib/content";
import { languageAlternates, localePath, ogLocale, type Locale } from "@/lib/i18n";
import { siteName } from "@/lib/site";
import { format, ui } from "@/lib/ui";

const copy = {
  zh: {
    title: "關於我們與隱私承諾",
    description: "SecTools 資安工具箱是開放原始碼、完全在瀏覽器本機運算的繁體中文資安工具箱。了解我們如何處理資料、本機儲存哪些設定，以及如何自行驗證。",
    shareDescription: "開放原始碼、完全在瀏覽器本機運算的資安工具箱：不上傳、不追蹤、可自行部署。",
    crumb: "關於與隱私",
    h1: "關於 SecTools 資安工具箱",
    lead: "SecTools 資安工具箱是給資安工程師、SOC 分析師、開發者與 CTF 選手的免費工作台。我們相信處理 Token、日誌與惡意樣本時，最安全的做法是讓資料根本不離開你的電腦——所以 {0} 個工具全部在瀏覽器本機執行。",
    principles: [
      ["工具輸入不離開瀏覽器", "所有雜湊、解碼、解析與計算都使用 JavaScript 與 Web Crypto API 在你的裝置上完成。工具程式碼不會呼叫 fetch、XHR 或 WebSocket，也沒有後端 API。"],
      ["沒有追蹤、沒有廣告", "網站原始碼不包含 Google Analytics、廣告聯播網、社群像素或第三方字型與 CDN。我們不知道你用了哪個工具，也不想知道。"],
      ["本機只存最少的偏好設定", "收藏、最近使用與深色模式設定存在你瀏覽器的 localStorage，只記錄工具代號（例如 jwt-decoder），從不保存你輸入的內容或結果。清除瀏覽器資料即可全部移除。"],
      ["原始碼公開、可自行部署", "完整原始碼公開於 GitHub，並以靜態檔案部署。你可以稽核每一行程式，也可以建置後放到公司內網，在完全隔離的環境中使用。"],
    ],
    verifyTitle: "不必相信我們，自己驗證",
    verifySteps: ["開啟任一工具頁面，按 F12 打開瀏覽器開發者工具並切換到 Network 面板。", "貼上測試資料並執行工具，確認沒有新的網路請求被送出。", "或是中斷網路連線後再操作，工具依然可以正常運算。"],
    feedbackA: "發現問題或想要新工具？歡迎到",
    feedbackB: "回報或提出建議。",
    start: "開始使用",
  },
  en: {
    title: "About & Privacy",
    description: "SecTools is an open-source security toolkit that runs entirely in your browser. Learn how we handle data, what is stored locally, and how to verify it yourself.",
    shareDescription: "An open-source security toolkit that runs entirely in your browser: no uploads, no tracking, self-hostable.",
    crumb: "About & privacy",
    h1: "About SecTools",
    lead: "SecTools is a free workbench for security engineers, SOC analysts, developers and CTF players. When you handle tokens, logs and malware samples, the safest approach is for the data never to leave your computer — so all {0} tools run locally in your browser.",
    principles: [
      ["Your input never leaves the browser", "Every hash, decode, parse and calculation runs on your device with JavaScript and the Web Crypto API. The tools never call fetch, XHR or WebSocket, and there is no backend."],
      ["No tracking, no ads", "The source contains no Google Analytics, ad networks, social pixels, third-party fonts or CDNs. We don't know which tools you use, and we don't want to."],
      ["Minimal local preferences", "Favorites, recent tools and your theme are kept in localStorage as tool IDs (like jwt-decoder) — never your input or results. Clearing browser data removes them."],
      ["Open source and self-hostable", "The full source is on GitHub and deploys as static files. Audit every line, or build it and host it on an air-gapped internal network."],
    ],
    verifyTitle: "Don't trust us — verify it",
    verifySteps: ["Open any tool page, press F12 and switch to the Network panel.", "Paste test data and run the tool. No new network requests appear.", "Or go offline and keep using the tool — it still works."],
    feedbackA: "Found a bug or want a new tool? Open an issue on",
    feedbackB: ".",
    start: "Get started",
  },
} as const;

export function aboutMetadata(locale: Locale): Metadata {
  const text = copy[locale];
  const brand = locale === "en" ? "SecTools Security Toolkit" : siteName;
  const image = locale === "en" ? "/og-en.jpg" : "/og.jpg";
  return {
    title: text.title,
    description: text.description,
    alternates: { canonical: localePath(locale, "/about/"), languages: languageAlternates("/about/") },
    openGraph: { type: "website", locale: ogLocale[locale], siteName: brand, title: `${text.title}｜${brand}`, description: text.shareDescription, url: localePath(locale, "/about/"), images: [{ url: image, width: 1200, height: 630, alt: brand }] },
  };
}

export function AboutPage({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const strings = ui[locale];
  const tools = localizedTools(locale);
  return (
    <div className="page-shell">
      <SiteHeader compact locale={locale} path="/about/" />
      <main id="main">
        <section className="tool-hero category-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"}>
              <Link href={localePath(locale, "/")}>{strings.breadcrumbHome}</Link><span aria-hidden="true">/</span><strong aria-current="page">{text.crumb}</strong>
            </nav>
            <span className="section-kicker">ABOUT · PRIVACY</span>
            <h1>{text.h1}</h1>
            <p className="category-hero__lead">{format(text.lead, tools.length)}</p>
          </div>
        </section>
        <section className="container about-grid">
          {text.principles.map(([title, body], index) => (
            <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></article>
          ))}
        </section>
        <section className="container about-verify">
          <div><span className="section-kicker">VERIFY IT YOURSELF</span><h2>{text.verifyTitle}</h2></div>
          <ol>{text.verifySteps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p>{text.feedbackA} <a className="text-link" href="https://github.com/stwater20/sectools" rel="noreferrer">GitHub</a>{text.feedbackB}</p>
        </section>
        <section className="container related-tools" aria-labelledby="about-categories">
          <div className="section-heading"><div><span className="section-kicker">START HERE</span><h2 id="about-categories">{text.start}</h2></div></div>
          <div className="related-grid">
            {localizedCategories(locale).map((item) => {
              const count = tools.filter((tool) => tool.category.slug === item.slug).length;
              return (
                <Link key={item.slug} href={localePath(locale, `/categories/${item.slug}/`)}>
                  <span aria-hidden="true">{count}</span>
                  <div><strong>{item.name}</strong><small>{format(strings.toolsCount, count)}</small></div>
                  <b aria-hidden="true">→</b>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

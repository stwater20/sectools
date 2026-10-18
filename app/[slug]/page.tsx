import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { ToolActions } from "@/components/tool-actions";
import { ToolWorkbench } from "@/components/tool-workbench";
import { absoluteUrl, jsonLd, siteLocale, siteUrl } from "@/lib/site";
import { categoryOf, findTool, relatedTools, toolCatalog } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolCatalog.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) return {};
  const title = `${tool.name}（${tool.englishName}）免費線上工具`;
  const description = `${tool.description} 免費、免登入，資料完全在瀏覽器本機處理，不會上傳。`;
  return {
    title,
    description,
    keywords: [...new Set([tool.name, tool.englishName, tool.category, ...tool.tags, `${tool.name} 線上工具`, `${tool.englishName} online`, `${tool.name} 免費`, "繁體中文資安工具"])],
    alternates: { canonical: `/${tool.slug}/` },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      siteName: "SecTools.tw Toolkit",
      title: `${title}｜SecTools.tw`,
      description,
      url: `/${tool.slug}/`,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${tool.name}｜SecTools.tw 資安工具箱` }],
    },
    twitter: { card: "summary_large_image", title: `${tool.name}｜SecTools.tw`, description, images: ["/og.jpg"] },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const category = categoryOf(tool);
  const related = relatedTools(tool, 6);
  const guide = tool.guide ?? {
    intro: `${tool.name}（${tool.englishName}）是適合資安工作與 CTF 的繁體中文線上工具。${tool.description}`,
    steps: [`準備要分析的內容，先移除不必要的正式憑證或個人資料。`, `在上方工作區輸入資料並選擇需要的格式或參數。`, `檢查並複製結果，再搭配原始證據與正式工具交叉驗證。`],
    useCases: [category.useCase, `快速辨識或處理 ${tool.tags.slice(0, 3).join("、")} 相關資料。`, "在不把輸入上傳到第三方伺服器的情況下完成初步分析。"],
  };
  const faqs = [
    { question: `${tool.name}會上傳我的資料嗎？`, answer: "不會。工具實作不會發出 fetch、XHR 或 WebSocket；輸入與結果只存在目前瀏覽器分頁，可由瀏覽器開發者工具的 Network 面板自行查核。" },
    { question: `${tool.name}需要付費或註冊嗎？`, answer: `不需要。${tool.name}與 SecTools.tw 上的所有工具都免費使用、免登入，沒有使用次數限制。` },
    { question: `可以在手機或離線環境使用${tool.name}嗎？`, answer: "可以。工具支援手機與桌面瀏覽器；頁面載入後即使中斷網路也能繼續運算。需要在內網使用時，也可以從 GitHub 取得原始碼自行部署。" },
    { question: `${tool.name}的結果可以直接作為正式判定嗎？`, answer: "不建議。工具適合快速分析與交叉核對，重要事件仍應保留原始證據，並使用正式驗證或鑑識流程確認。" },
  ];
  const pageUrl = absoluteUrl(`/${tool.slug}/`);
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, alternateName: tool.englishName, url: pageUrl,
      applicationCategory: "SecurityApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript", inLanguage: siteLocale,
      isAccessibleForFree: true, featureList: tool.tags, description: tool.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
      publisher: { "@type": "Organization", name: "SecTools.tw", url: "https://sectools.tw/" },
    },
    {
      "@context": "https://schema.org", "@type": "HowTo", name: `如何使用 ${tool.name}`, inLanguage: siteLocale,
      step: guide.steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, text: step })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "資安工具庫", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(`/categories/${category.slug}/`) },
        { "@type": "ListItem", position: 3, name: tool.name, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
  ];

  return (
    <div className="page-shell tool-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact />
      <main id="main">
        <section className="tool-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label="麵包屑">
              <Link href="/">工具庫</Link><span aria-hidden="true">/</span>
              <Link href={`/categories/${category.slug}/`}>{category.name}</Link><span aria-hidden="true">/</span>
              <strong aria-current="page">{tool.name}</strong>
            </nav>
            <div className="tool-hero__title">
              <span className="tool-hero__icon" aria-hidden="true">{tool.icon}</span>
              <div>
                <span className="section-kicker">{tool.englishName.toUpperCase()}</span>
                <h1>{tool.name}</h1>
                <p>{tool.description}</p>
              </div>
            </div>
            <div className="tool-hero__bar">
              <div className="local-badge"><i className="pulse-dot" /><strong>本機處理</strong><span>你的輸入不會離開此裝置</span></div>
              <ToolActions slug={tool.slug} name={tool.name} />
            </div>
          </div>
        </section>
        <section className="container workbench-wrap" aria-label={`${tool.name}工作區`}>
          <div className="workbench-header"><span>WORKBENCH</span><p>輸入上限 2 MB · 不保留歷史紀錄</p></div>
          <div className="workbench"><ToolWorkbench slug={tool.slug} /></div>
        </section>
        <section className="container tool-guide">
          <div className="tool-guide__grid">
            <article>
              <span className="section-kicker">HOW TO USE</span>
              <h2>如何使用 {tool.name}</h2>
              <p>{guide.intro}</p>
              <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </article>
            <article>
              <span className="section-kicker">USE CASES</span>
              <h2>{tool.name}常見用途</h2>
              <ul>{guide.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}</ul>
              <p className="search-terms">相關主題：{tool.tags.join("、")}</p>
            </article>
          </div>
          <div className="tool-faq">
            <span className="section-kicker">FAQ</span>
            <h2>{tool.name}常見問題</h2>
            {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </div>
        </section>
        <section className="container tool-notes">
          <div><span className="section-kicker">SECURITY NOTE</span><h2>安全使用提醒</h2></div>
          <p>本工具適合分析與輔助判讀，不替代正式的安全驗證流程。請勿在共享裝置貼上仍有效的憑證、私鑰或生產環境密碼；完成後關閉分頁即可清除輸入。</p>
        </section>
        <section className="container related-tools" aria-labelledby="related-title">
          <div className="section-heading">
            <div><span className="section-kicker">KEEP WORKING</span><h2 id="related-title">相關工具</h2></div>
            <Link className="text-link" href={`/categories/${category.slug}/`}>查看全部{category.name}工具 →</Link>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <Link key={item.slug} href={`/${item.slug}/`}>
                <span aria-hidden="true">{item.icon}</span>
                <div><strong>{item.name}</strong><small>{item.englishName}</small></div>
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

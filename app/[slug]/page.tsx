import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { ToolActions } from "@/components/tool-actions";
import { ToolWorkbench } from "@/components/tool-workbench";
import { absoluteUrl, jsonLd, siteLocale, siteName, siteUrl } from "@/lib/site";
import { categoryOf, findTool, relatedTools, toolCatalog } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolCatalog.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) return {};
  const title = `${tool.name}｜線上 ${tool.englishName}`;
  const description = `${tool.description}免費、免註冊，資料只在你的瀏覽器處理，不會上傳。`;
  return {
    title,
    description,
    keywords: [...new Set([tool.name, tool.englishName, tool.category, ...tool.tags, `${tool.name} 線上工具`, `${tool.englishName} online`, `${tool.name} 免費`, "繁體中文資安工具"])],
    alternates: { canonical: `/${tool.slug}/` },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      siteName,
      title: `${title}｜${siteName}`,
      description,
      url: `/${tool.slug}/`,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${tool.name}｜${siteName}` }],
    },
    twitter: { card: "summary_large_image", title: `${tool.name}｜${siteName}`, description, images: ["/og.jpg"] },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const category = categoryOf(tool);
  const related = relatedTools(tool, 6);
  const guide = tool.guide ?? {
    intro: `${tool.description}${tool.name}（${tool.englishName}）完全在瀏覽器內執行，適合處理不方便貼到第三方網站的資料。`,
    steps: ["把要分析的內容貼到上方工作區；若含正式環境的憑證或個資，建議先遮蔽。", "依需要調整格式或參數，再執行工具。", "確認結果後複製使用；正式結論請再與原始證據或其他工具交叉比對。"],
    useCases: [category.useCase, `處理 ${tool.tags.slice(0, 3).join("、")} 相關資料。`, "在不能使用外部服務的環境（例如事件調查期間）快速完成初步分析。"],
  };
  const faqs = [
    { question: `${tool.name}會上傳我的資料嗎？`, answer: "不會。工具不會發出任何網路請求，輸入與結果只存在目前的分頁。打開開發者工具的 Network 面板，就能自己確認。" },
    { question: `${tool.name}要付費或註冊嗎？`, answer: `都不用。${tool.name}和 SecTools 資安工具箱裡的其他工具一樣，免費、免帳號，也沒有次數限制。` },
    { question: `手機或離線環境可以用${tool.name}嗎？`, answer: "可以。手機與電腦瀏覽器都能使用，頁面載入後斷網也能繼續運算。需要在內網使用，也可以從 GitHub 取得原始碼自行部署。" },
    { question: `${tool.name}的結果可以直接當作正式判定嗎？`, answer: "建議當作初步分析與交叉比對使用。重要事件請保留原始證據，並以正式的驗證或鑑識流程確認。" },
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
          <p>這個工具用於分析與輔助判讀，不能取代正式的安全驗證流程。請避免在共用電腦上貼入仍有效的憑證、私鑰或正式環境密碼；用完關閉分頁，輸入內容就會清除。</p>
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

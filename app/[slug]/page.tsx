import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { ToolWorkbench } from "@/components/tool-workbench";
import { findTool, toolCatalog } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolCatalog.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) return {};
  return {
    title: tool.name,
    description: `${tool.description} 免費、免登入，資料完全在瀏覽器本機處理。`,
    keywords: [...new Set([tool.name, tool.englishName, tool.category, ...tool.tags, `${tool.name} 線上工具`, `${tool.name} 免費`, "繁體中文資安工具"])],
    alternates: { canonical: `/${tool.slug}/` },
    openGraph: { title: `${tool.name}｜SecTools.tw Toolkit`, description: tool.description, url: `/${tool.slug}/` },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const related = toolCatalog.filter((item) => item.category === tool.category && item.slug !== tool.slug).slice(0, 3);
  const categoryUseCase = {
    "編碼與雜湊": "處理 API、檔案驗證、資料編碼與惡意程式分析時常見的格式。",
    "威脅分析": "整理事件調查、SOC 告警、釣魚郵件與 Threat Intelligence 資料。",
    "網路與風險": "輔助網路設定、弱點管理、Web 安全檢查與風險溝通。",
    "密碼與驗證": "檢查身分驗證、Token、密碼與多因素驗證流程。",
    "鑑識與分析": "快速初篩檔案、時間戳與二進位證據，再交由正式鑑識流程確認。",
    "CTF 工具": "解答密碼學、Pwn、Web 與資料編碼類 CTF 題目。",
  }[tool.category];
  const guide = tool.guide ?? {
    intro: `${tool.name}（${tool.englishName}）是適合資安工作與 CTF 的繁體中文線上工具。${tool.description}`,
    steps: [`準備要分析的內容，先移除不必要的正式憑證或個人資料。`, `在上方工作區輸入資料並選擇需要的格式或參數。`, `檢查並複製結果，再搭配原始證據與正式工具交叉驗證。`],
    useCases: [categoryUseCase, `快速辨識或處理 ${tool.tags.slice(0, 3).join("、")} 相關資料。`, "在不把輸入上傳到第三方伺服器的情況下完成初步分析。"],
  };
  const faqs = [
    { question: `${tool.name}會上傳我的資料嗎？`, answer: "不會。工具實作不會發出 fetch、XHR 或 WebSocket；輸入與結果只存在目前瀏覽器分頁，可由瀏覽器開發者工具的 Network 面板自行查核。" },
    { question: `${tool.name}的結果可以直接作為正式判定嗎？`, answer: "不建議。工具適合快速分析與交叉核對，重要事件仍應保留原始證據，並使用正式驗證或鑑識流程確認。" },
  ];
  const structuredData = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name,
    applicationCategory: "SecurityApplication", operatingSystem: "Any", inLanguage: "zh-Hant-TW", featureList: tool.tags,
    offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" }, description: tool.description,
  };
  const jsonLd = JSON.stringify([structuredData, {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "資安工具庫", item: "https://tools.sectools.tw/" },
      { "@type": "ListItem", position: 2, name: tool.category },
      { "@type": "ListItem", position: 3, name: tool.name, item: `https://tools.sectools.tw/${tool.slug}/` },
    ],
  }, {
    "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  }]).replace(/</g, "\\u003c");

  return <div className="page-shell tool-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /><SiteHeader compact /><main><section className="tool-hero"><div className="container"><nav className="breadcrumbs" aria-label="麵包屑"><Link href="/">工具庫</Link><span>/</span><span>{tool.category}</span><span>/</span><strong>{tool.name}</strong></nav><div className="tool-hero__title"><span className="tool-hero__icon" aria-hidden="true">{tool.icon}</span><div><span className="section-kicker">{tool.englishName.toUpperCase()}</span><h1>{tool.name}</h1><p>{tool.description}</p></div></div><div className="local-badge"><i className="pulse-dot" /><strong>本機處理</strong><span>你的輸入不會離開此裝置</span></div></div></section><section className="container workbench-wrap"><div className="workbench-header"><span>WORKBENCH</span><p>輸入上限 2 MB · 不保留歷史紀錄</p></div><div className="workbench"><ToolWorkbench slug={tool.slug} /></div></section><section className="container tool-guide"><div className="tool-guide__grid"><article><span className="section-kicker">HOW TO USE</span><h2>如何使用 {tool.name}</h2><p>{guide.intro}</p><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></article><article><span className="section-kicker">USE CASES</span><h2>{tool.name}常見用途</h2><ul>{guide.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}</ul><p className="search-terms">相關主題：{tool.tags.join("、")}</p></article></div><div className="tool-faq"><span className="section-kicker">FAQ</span><h2>{tool.name}常見問題</h2>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section><section className="container tool-notes"><div><span className="section-kicker">SECURITY NOTE</span><h2>安全使用提醒</h2></div><p>本工具適合分析與輔助判讀，不替代正式的安全驗證流程。請勿在共享裝置貼上仍有效的憑證、私鑰或生產環境密碼；完成後關閉分頁即可清除輸入。</p></section><section className="container related-tools"><div className="section-heading"><div><span className="section-kicker">KEEP WORKING</span><h2>同類工具</h2></div></div><div className="related-grid">{related.map((item) => <Link key={item.slug} href={`/${item.slug}/`}><span>{item.icon}</span><div><strong>{item.name}</strong><small>{item.englishName}</small></div><b>↗</b></Link>)}</div></section></main><SiteFooter /></div>;
}

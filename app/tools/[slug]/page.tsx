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
    alternates: { canonical: `/tools/${tool.slug}/` },
    openGraph: { title: `${tool.name}｜SecTools.tw Toolkit`, description: tool.description, url: `/tools/${tool.slug}/` },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const related = toolCatalog.filter((item) => item.category === tool.category && item.slug !== tool.slug).slice(0, 3);
  const structuredData = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name,
    applicationCategory: "SecurityApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" }, description: tool.description,
  };

  return <div className="page-shell tool-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><SiteHeader compact /><main><section className="tool-hero"><div className="container"><nav className="breadcrumbs" aria-label="麵包屑"><Link href="/">工具庫</Link><span>/</span><span>{tool.category}</span><span>/</span><strong>{tool.name}</strong></nav><div className="tool-hero__title"><span className="tool-hero__icon" aria-hidden="true">{tool.icon}</span><div><span className="section-kicker">{tool.englishName.toUpperCase()}</span><h1>{tool.name}</h1><p>{tool.description}</p></div></div><div className="local-badge"><i className="pulse-dot" /><strong>本機處理</strong><span>你的輸入不會離開此裝置</span></div></div></section><section className="container workbench-wrap"><div className="workbench-header"><span>WORKBENCH</span><p>輸入上限 2 MB · 不保留歷史紀錄</p></div><div className="workbench"><ToolWorkbench slug={tool.slug} /></div></section><section className="container tool-notes"><div><span className="section-kicker">SECURITY NOTE</span><h2>安全使用提醒</h2></div><p>本工具適合分析與輔助判讀，不替代正式的安全驗證流程。請勿在共享裝置貼上仍有效的憑證、私鑰或生產環境密碼；完成後關閉分頁即可清除輸入。</p></section><section className="container related-tools"><div className="section-heading"><div><span className="section-kicker">KEEP WORKING</span><h2>同類工具</h2></div></div><div className="related-grid">{related.map((item) => <Link key={item.slug} href={`/tools/${item.slug}/`}><span>{item.icon}</span><div><strong>{item.name}</strong><small>{item.englishName}</small></div><b>↗</b></Link>)}</div></section></main><SiteFooter /></div>;
}

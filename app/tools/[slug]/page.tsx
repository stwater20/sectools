import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    title: `${tool.name}已搬遷`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/${tool.slug}/` },
  };
}

export default async function LegacyToolRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  return (
    <main className="legacy-redirect">
      <meta httpEquiv="refresh" content={`0;url=/${tool.slug}/`} />
      <h1>{tool.name}已搬遷</h1>
      <p>正在前往新的工具網址。</p>
      <Link className="primary-button" href={`/${tool.slug}/`}>立即開啟工具</Link>
    </main>
  );
}

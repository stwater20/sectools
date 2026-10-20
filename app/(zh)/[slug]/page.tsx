import { ToolPage, toolMetadata } from "@/components/pages/tool-page";
import { toolCatalog } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return toolCatalog.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return toolMetadata((await params).slug, "zh");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ToolPage slug={(await params).slug} locale="zh" />;
}

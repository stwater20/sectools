import { GuidePage, guideMetadata } from "@/components/pages/guide-page";
import { guides } from "@/lib/guides";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return guideMetadata((await params).slug, "zh");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <GuidePage slug={(await params).slug} locale="zh" />;
}

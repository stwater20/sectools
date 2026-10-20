import { CategoryPage, categoryMetadata } from "@/components/pages/category-page";
import { categories } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return categoryMetadata((await params).slug, "zh");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <CategoryPage slug={(await params).slug} locale="zh" />;
}

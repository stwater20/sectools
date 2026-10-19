import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { absoluteUrl, jsonLd, siteName, siteUrl } from "@/lib/site";
import { categories, findCategory, toolCatalog } from "@/lib/tool-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) return {};
  const count = toolCatalog.filter((tool) => tool.category === category.name).length;
  const title = `${category.title}｜${count} 個免費線上工具`;
  return {
    title,
    description: `${category.summary}全部免費、免註冊，資料只在瀏覽器本機處理。`,
    alternates: { canonical: `/categories/${category.slug}/` },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      siteName,
      title: `${title}｜${siteName}`,
      description: category.summary,
      url: `/categories/${category.slug}/`,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${category.title}｜${siteName}` }],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();
  const tools = toolCatalog.filter((tool) => tool.category === category.name);
  const others = categories.filter((item) => item.slug !== category.slug);
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", name: category.title, description: category.summary,
      url: absoluteUrl(`/categories/${category.slug}/`), inLanguage: "zh-Hant-TW",
      mainEntity: {
        "@type": "ItemList", numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteUrl(`/${tool.slug}/`) })),
      },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "資安工具庫", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(`/categories/${category.slug}/`) },
      ],
    },
  ];

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SiteHeader compact />
      <main id="main">
        <section className="tool-hero category-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label="麵包屑">
              <Link href="/">工具庫</Link><span aria-hidden="true">/</span><strong aria-current="page">{category.name}</strong>
            </nav>
            <span className="section-kicker">{category.label} · {tools.length} TOOLS</span>
            <h1>{category.title}</h1>
            <p className="category-hero__lead">{category.intro}</p>
          </div>
        </section>
        <section className="container category-tools" aria-label={`${category.name}工具列表`}>
          <ol className="category-list">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link href={`/${tool.slug}/`}>
                  <span className="category-list__icon" aria-hidden="true">{tool.icon}</span>
                  <span className="category-list__body">
                    <strong>{tool.name}</strong>
                    <small>{tool.englishName}</small>
                    <p>{tool.description}</p>
                  </span>
                  <b aria-hidden="true">→</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section className="container related-tools" aria-labelledby="other-categories">
          <div className="section-heading">
            <div><span className="section-kicker">MORE CATEGORIES</span><h2 id="other-categories">其他分類</h2></div>
          </div>
          <div className="related-grid">
            {others.map((item) => (
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

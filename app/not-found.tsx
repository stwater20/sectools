import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { categories } from "@/lib/tool-catalog";

export default function NotFound() {
  return (
    <div className="page-shell">
      <SiteHeader compact />
      <main id="main" className="container not-found">
        <div className="empty-state">
          <span aria-hidden="true">404</span>
          <h1>找不到這個頁面</h1>
          <p>網址可能已變更，或工具還在開發中。按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 搜尋工具，或從分類開始瀏覽。</p>
          <div className="not-found__links">
            <Link className="primary-button" href="/">返回工具庫</Link>
            {categories.map((category) => <Link key={category.slug} className="ghost-button" href={`/categories/${category.slug}/`}>{category.name}</Link>)}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

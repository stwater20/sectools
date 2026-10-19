import Link from "next/link";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { toSummary } from "@/lib/search";
import { categories, toolCatalog } from "@/lib/tool-catalog";

const toolSummaries = toolCatalog.map(toSummary);

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="SecTools 資安工具箱 首頁">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="4 8 56 44"><path className="arch-main" d="M17 39V29c0-8 6-14 14-14s14 6 14 14v10" /><path className="arch-side" d="M9 40V34c0-5 4-9 9-9M55 40v-6c0-5-4-9-9-9" /><path className="arch-base" d="M10 47h44" /></svg>
      </span>
      <span className="brand-copy">
        <strong>SecTools</strong>
        <small>資安工具箱</small>
      </span>
    </Link>
  );
}

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#main">跳到主要內容</a>
      <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
        <div className="site-header__inner">
          <Brand />
          <nav aria-label="主要導覽">
            <Link href="/#tools">所有工具</Link>
            <Link href="/#categories">分類</Link>
            <Link href="/about/">關於與隱私</Link>
          </nav>
          <div className="site-header__actions">
            <CommandPalette tools={toolSummaries} />
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__intro">
          <Brand />
          <p>給資安工程師、SOC 分析師、開發者與 CTF 玩家的免費工具箱。{toolCatalog.length} 個工具全部在瀏覽器本機執行，不上傳、不追蹤、免註冊。</p>
          <Link className="site-footer__about" href="/about/">關於與隱私承諾 →</Link>
        </div>
        <nav className="site-footer__nav" aria-label="工具分類">
          {categories.map((category) => (
            <div key={category.slug}>
              <Link className="site-footer__heading" href={`/categories/${category.slug}/`}>{category.name}</Link>
              <ul>
                {toolCatalog.filter((tool) => tool.category === category.name).map((tool) => (
                  <li key={tool.slug}><Link href={`/${tool.slug}/`}>{tool.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="site-footer__legal">
          <span>© {new Date().getFullYear()} SecTools.tw</span>
          <span>輸入資料不離開你的瀏覽器</span>
          <a href="https://sectools.tw/" rel="noreferrer">SecTools.tw 主站</a>
          <a href="https://github.com/stwater20/sectools" rel="noreferrer">GitHub 原始碼</a>
        </p>
      </div>
    </footer>
  );
}

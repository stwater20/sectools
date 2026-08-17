import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="SecTools.tw Toolkit 首頁">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-copy">
        <strong>SECTOOLS.TW</strong>
        <small>THE SECURITY TOOLKIT</small>
      </span>
    </Link>
  );
}

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <div className="site-header__inner">
        <Brand />
        <nav aria-label="主要導覽">
          <Link href="/#tools">所有工具</Link>
          <Link href="/#privacy">隱私設計</Link>
          <a href="https://sectools.tw/" rel="noreferrer">SecTools.tw</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Brand />
        <p>給防守者、研究者與開發者的免費資安工作台。</p>
        <p className="site-footer__legal">© {new Date().getFullYear()} SecTools.tw · 輸入資料不離開你的瀏覽器</p>
      </div>
    </footer>
  );
}

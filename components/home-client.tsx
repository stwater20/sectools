"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { markRecent, toggleFavorite, useFavorites, useRecent } from "@/lib/local-prefs";
import { searchTools, type ToolSummary } from "@/lib/search";

const quickSearches = ["JWT", "SHA-256", "CIDR", "CVSS", "Base64", "IOC", "XOR"];
const popularSlugs = ["jwt-decoder", "hash-generator", "cidr-calculator", "cvss-calculator", "base64-codec", "ioc-extractor"];
const allLabel = "全部";
const favoritesLabel = "收藏";

function ToolCard({ tool, favorite }: { tool: ToolSummary; favorite: boolean }) {
  return (
    <article className="tool-card">
      <span className="tool-card__icon" aria-hidden="true">{tool.icon}</span>
      <div className="tool-card__body">
        <div className="tool-card__meta">
          <span>{tool.category}</span>
          {tool.status && <span className={`status status--${tool.status}`}>{tool.status === "new" ? "NEW" : "熱門"}</span>}
        </div>
        <h3><Link href={`/${tool.slug}/`} onClick={() => markRecent(tool.slug)}>{tool.name}</Link></h3>
        <small className="tool-card__en">{tool.englishName}</small>
        <p>{tool.description}</p>
      </div>
      <button
        className={`favorite-button ${favorite ? "is-active" : ""}`}
        type="button"
        aria-label={favorite ? `從收藏移除 ${tool.name}` : `收藏 ${tool.name}`}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(tool.slug)}
      >
        {favorite ? "★" : "☆"}
      </button>
      <span className="tool-card__launch" aria-hidden="true">開啟工具 <span>→</span></span>
    </article>
  );
}

export function HomeClient({ tools, categories }: { tools: ToolSummary[]; categories: Array<{ name: string; slug: string }> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allLabel);
  const favorites = useFavorites();
  const recent = useRecent();
  const searchRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") ?? "";
    const initialCategory = categories.find((item) => item.slug === params.get("category"))?.name;
    if (initialQuery || initialCategory) {
      queueMicrotask(() => {
        setQuery(initialQuery);
        if (initialCategory) setCategory(initialCategory);
        libraryRef.current?.scrollIntoView({ block: "start" });
      });
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && !target?.closest("input, textarea, select, [contenteditable='true']")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [categories]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const slug = categories.find((item) => item.name === category)?.slug;
    if (slug) params.set("category", slug);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, "", next);
  }, [query, category, categories]);

  const counts = useMemo(() => {
    const map = new Map<string, number>([[allLabel, tools.length], [favoritesLabel, favorites.length]]);
    for (const tool of tools) map.set(tool.category, (map.get(tool.category) ?? 0) + 1);
    return map;
  }, [tools, favorites]);

  const visibleTools = useMemo(() => {
    const inCategory = tools.filter((tool) => category === allLabel || (category === favoritesLabel ? favorites.includes(tool.slug) : tool.category === category));
    return searchTools(inCategory, query);
  }, [tools, query, category, favorites]);

  const recentTools = recent.map((slug) => tools.find((tool) => tool.slug === slug)).filter((tool): tool is ToolSummary => Boolean(tool)).slice(0, 4);

  function runQuickSearch(value: string) {
    setQuery(value);
    setCategory(allLabel);
    libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setQuery("");
    if (event.key === "Enter" && visibleTools.length > 0 && query.trim()) {
      libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero__glow" aria-hidden="true"><span /><span /><span /></div>
        <div className="container hero__inner">
          <a className="hero__badge" href="#tools">
            <i className="pulse-dot" />
            <span>{tools.length} 個工具・100% 本機運算</span>
            <b aria-hidden="true">→</b>
          </a>
          <h1>資安日常工具，<br /><span className="gradient-text">資料不出瀏覽器。</span></h1>
          <p className="hero__lead">JWT 解碼、Hash 計算、CIDR 換算、CVSS 評分、IOC 擷取⋯⋯{tools.length} 個資安工程師、SOC 分析師與 CTF 玩家天天用到的工具，打開就能用。不用註冊、沒有廣告，貼上的內容只在你的電腦上運算。</p>
          <div className="hero-search" role="search">
            <svg className="hero-search__icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <label className="sr-only" htmlFor="tool-search">搜尋資安工具</label>
            <input
              ref={searchRef}
              id="tool-search"
              type="search"
              placeholder="搜尋工具，例如 JWT、雜湊、CIDR…"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <kbd aria-hidden="true">/</kbd>
          </div>
          <div className="quick-searches">
            <span>熱門</span>
            {quickSearches.map((item) => <button key={item} type="button" onClick={() => runQuickSearch(item)}>{item}</button>)}
          </div>
        </div>

        <div className="container hero__shot">
          <div className="app-window">
            <div className="app-window__bar">
              <span className="app-window__dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="app-window__url" aria-hidden="true"><svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>tools.sectools.tw/jwt-decoder</span>
              <span className="app-window__badge" aria-hidden="true"><i className="pulse-dot" />本機處理</span>
            </div>
            <div className="app-window__body">
              <nav className="app-window__side" aria-labelledby="popular-title">
                <h2 id="popular-title">大家最常開的工具</h2>
                <ol>
                  {popularSlugs.map((slug) => tools.find((tool) => tool.slug === slug)).filter((tool): tool is ToolSummary => Boolean(tool)).map((tool, index) => (
                    <li key={tool.slug}>
                      <Link className={index === 0 ? "is-current" : ""} href={`/${tool.slug}/`} onClick={() => markRecent(tool.slug)}>
                        <span aria-hidden="true">{tool.icon}</span>
                        <strong>{tool.name}</strong>
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="app-window__main" aria-hidden="true">
                <div className="mock-field">
                  <small>JWT TOKEN</small>
                  <code><em className="t-a">eyJhbGciOiJIUzI1NiJ9</em>.<em className="t-b">eyJzdWIiOiJhbGljZSIsInJvbGUiOiJhZG1pbiJ9</em>.<em className="t-c">4pcPyMD09olPSyXnrXCjTwXyr4BsezdI1AVTmud2fU4</em></code>
                </div>
                <div className="mock-grid">
                  <div className="mock-panel">
                    <small>HEADER</small>
                    <pre>{"{\n  "}<b>&quot;alg&quot;</b>{": "}<i>&quot;HS256&quot;</i>{"\n}"}</pre>
                  </div>
                  <div className="mock-panel">
                    <small>PAYLOAD</small>
                    <pre>{"{\n  "}<b>&quot;sub&quot;</b>{": "}<i>&quot;alice&quot;</i>{",\n  "}<b>&quot;role&quot;</b>{": "}<i>&quot;admin&quot;</i>{"\n}"}</pre>
                  </div>
                </div>
                <div className="mock-status">
                  <span className="is-ok">✓ 格式正確</span>
                  <span className="is-warn">! 未設定 exp 到期時間</span>
                  <span>0 個網路請求</span>
                </div>
              </div>
            </div>
          </div>
          <dl className="hero__stats">
            <div><dt>免費工具</dt><dd>{tools.length}</dd></div>
            <div><dt>伺服器收到的資料</dt><dd>0 B</dd></div>
            <div><dt>註冊與登入</dt><dd>免</dd></div>
            <div><dt>工具分類</dt><dd>{categories.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="tool-library container" id="tools" ref={libraryRef} aria-labelledby="tools-title">
        <div className="section-heading section-heading--center">
          <span className="section-kicker">TOOLS</span>
          <h2 id="tools-title">全部工具</h2>
          <p>按 ☆ 把常用工具加入收藏；在任何頁面按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 都能直接搜尋。</p>
        </div>

        <div className="category-tabs" role="group" aria-label="工具分類篩選">
          {[allLabel, favoritesLabel, ...categories.map((item) => item.name)].map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "is-active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === favoritesLabel ? "★ 收藏" : item}
              <span className="category-tabs__count">{counts.get(item) ?? 0}</span>
            </button>
          ))}
        </div>

        {recentTools.length > 0 && !query && category === allLabel && (
          <div className="recent-strip">
            <span>最近使用</span>
            {recentTools.map((tool) => <Link key={tool.slug} href={`/${tool.slug}/`}><b aria-hidden="true">{tool.icon}</b>{tool.name}</Link>)}
          </div>
        )}

        <div className="results-line" aria-live="polite">
          <span><strong>{visibleTools.length}</strong> 個工具{query.trim() && <>符合「{query.trim()}」</>}</span>
          {(query || category !== allLabel) && <button type="button" onClick={() => { setQuery(""); setCategory(allLabel); }}>清除篩選 ×</button>}
        </div>

        {visibleTools.length ? (
          <div className="tool-grid">
            {visibleTools.map((tool) => <ToolCard key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>{category === favoritesLabel && !query ? "還沒有收藏的工具" : "沒有找到相符工具"}</h3>
            <p>{category === favoritesLabel && !query ? "在工具卡片上按 ☆，常用的工具就會集中在這裡。收藏只存在你的瀏覽器。" : "換個說法試試，例如英文名稱「jwt」、「hash」、「pcap」，或清除篩選。"}</p>
            <button type="button" onClick={() => { setQuery(""); setCategory(allLabel); }}>查看全部工具</button>
          </div>
        )}
      </section>
    </>
  );
}

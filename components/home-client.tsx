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
      <span className="tool-card__launch" aria-hidden="true">開啟 <span>→</span></span>
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
        <div className="hero__texture" aria-hidden="true" />
        <div className="container hero__inner">
          <div className="hero__main">
          <div className="eyebrow"><span /> SECTOOLS.TW OPEN TOOLKIT</div>
          <h1>真正能用的<br /><em>資安工具箱。</em></h1>
          <p className="hero__lead">為資安工程師、SOC 分析師、開發者與 CTF 選手打造的 {tools.length} 個免費線上工具。免登入、不上傳，所有運算都在你的瀏覽器裡完成。</p>
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
            <span>熱門搜尋</span>
            {quickSearches.map((item) => <button key={item} type="button" onClick={() => runQuickSearch(item)}>{item}</button>)}
          </div>
          <dl className="hero__stats">
            <div><dt>免費工具</dt><dd>{tools.length}</dd></div>
            <div><dt>上傳到伺服器的資料</dt><dd>0 B</dd></div>
            <div><dt>需要註冊</dt><dd>不用</dd></div>
            <div><dt>工具分類</dt><dd>{categories.length}</dd></div>
          </dl>
          </div>
          <aside className="hero__aside" aria-labelledby="popular-title">
            <div className="hero__aside-head">
              <span className="hero__dots" aria-hidden="true"><i /><i /><i /></span>
              <h2 id="popular-title">最常用的工具</h2>
            </div>
            <ol>
              {popularSlugs.map((slug) => tools.find((tool) => tool.slug === slug)).filter((tool): tool is ToolSummary => Boolean(tool)).map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/${tool.slug}/`} onClick={() => markRecent(tool.slug)}>
                    <span aria-hidden="true">{tool.icon}</span>
                    <span><strong>{tool.name}</strong><small>{tool.englishName}</small></span>
                    <b aria-hidden="true">→</b>
                  </Link>
                </li>
              ))}
            </ol>
            <p><i className="pulse-dot" /> 全部在本機執行 · 0 個網路請求</p>
          </aside>
        </div>
      </section>

      <section className="tool-library container" id="tools" ref={libraryRef} aria-labelledby="tools-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">FIELD KIT / 01</span>
            <h2 id="tools-title">工具庫</h2>
          </div>
          <p>點 ☆ 收藏常用工具；在任何頁面按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 都能快速搜尋。</p>
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
            <p>{category === favoritesLabel && !query ? "在工具卡片上點 ☆，常用工具就會出現在這裡（只存在你的瀏覽器）。" : "試試英文名稱，例如「jwt」、「hash」、「pcap」，或清除目前篩選。"}</p>
            <button type="button" onClick={() => { setQuery(""); setCategory(allLabel); }}>查看全部工具</button>
          </div>
        )}
      </section>
    </>
  );
}

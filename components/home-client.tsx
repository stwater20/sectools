"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { markRecent, toggleFavorite, useFavorites, useRecent } from "@/lib/local-prefs";
import { localePath, type Locale } from "@/lib/i18n";
import { searchTools, type ToolSummary } from "@/lib/search";

const popularSlugs = ["jwt-decoder", "hash-generator", "cidr-calculator", "cvss-calculator", "base64-codec", "ioc-extractor"];
const allLabel = "__all";
const favoritesLabel = "__favorites";

const homeStrings = {
  zh: {
    quickSearches: ["JWT", "Base64", "RSA", "隱寫", "CIDR", "CVSS", "QR"],
    popular: "熱門", newBadge: "NEW", hot: "熱門", unfavorite: "從收藏移除 {0}", addFavorite: "收藏 {0}", open: "開啟工具",
    badge: "{0} 個工具・100% 本機運算", h1a: "免費線上", h1b: "資安工具箱", subtitle: "{0} 個工具，資料只在你的瀏覽器裡運算。",
    lead: "JWT 解碼、Hash 計算、CIDR 換算、CVSS 評分、IOC 擷取⋯⋯資安工程師、SOC 分析師與 CTF 玩家天天用到的工具，不用註冊、沒有廣告，打開就能用。",
    searchLabel: "搜尋資安工具", searchPlaceholder: "搜尋工具，例如 JWT、雜湊、CIDR…", local: "本機處理", mostUsed: "大家最常開的工具",
    mockOk: "✓ 格式正確", mockWarn: "! 未設定 exp 到期時間", mockRequests: "0 個網路請求",
    statTools: "免費工具", statBytes: "伺服器收到的資料", statSignup: "註冊與登入", statSignupValue: "免", statCategories: "工具分類",
    toolsKicker: "TOOLS", toolsTitle: "全部工具", toolsHintA: "按 ☆ 把常用工具加入收藏；在任何頁面按", toolsHintB: "都能直接搜尋。",
    filterLabel: "工具分類篩選", all: "全部", favorites: "★ 收藏", recent: "最近使用", count: "個工具", matching: "符合「{0}」", clear: "清除篩選 ×",
    noFavoritesTitle: "還沒有收藏的工具", noResultsTitle: "沒有找到相符工具",
    noFavoritesBody: "在工具卡片上按 ☆，常用的工具就會集中在這裡。收藏只存在你的瀏覽器。", noResultsBody: "換個說法試試，例如英文名稱「jwt」、「hash」、「pcap」，或清除篩選。", showAll: "查看全部工具",
  },
  en: {
    quickSearches: ["JWT", "Base64", "RSA", "Steganography", "CIDR", "CVSS", "QR"],
    popular: "Popular", newBadge: "NEW", hot: "POPULAR", unfavorite: "Remove {0} from favorites", addFavorite: "Add {0} to favorites", open: "Open tool",
    badge: "{0} tools · 100% in your browser", h1a: "Free online", h1b: "security toolkit", subtitle: "{0} tools. Your data never leaves your browser.",
    lead: "JWT decoding, hashing, CIDR math, CVSS scoring, IOC extraction and CTF solvers — the tools security engineers, SOC analysts and CTF players reach for every day. No sign-up, no ads, ready when you are.",
    searchLabel: "Search security tools", searchPlaceholder: "Search tools, e.g. JWT, hash, CIDR…", local: "Runs locally", mostUsed: "Most-used tools",
    mockOk: "✓ Well-formed", mockWarn: "! No exp claim", mockRequests: "0 network requests",
    statTools: "Free tools", statBytes: "Data sent to servers", statSignup: "Sign-up", statSignupValue: "None", statCategories: "Categories",
    toolsKicker: "TOOLS", toolsTitle: "All tools", toolsHintA: "Star ☆ the tools you use most. Press", toolsHintB: "on any page to search.",
    filterLabel: "Filter by category", all: "All", favorites: "★ Favorites", recent: "Recent", count: "tools", matching: "matching “{0}”", clear: "Clear filters ×",
    noFavoritesTitle: "No favorites yet", noResultsTitle: "No matching tools",
    noFavoritesBody: "Tap ☆ on a tool card to collect your go-to tools here. Favorites stay in your browser.", noResultsBody: "Try another term, such as “jwt”, “hash” or “pcap”, or clear the filters.", showAll: "Show all tools",
  },
};
type HomeStrings = (typeof homeStrings)["zh"];
const fill = (template: string, value: string | number) => template.replace("{0}", String(value));

function ToolCard({ tool, favorite, locale, strings }: { tool: ToolSummary; favorite: boolean; locale: Locale; strings: HomeStrings }) {
  return (
    <article className="tool-card">
      <span className="tool-card__icon" aria-hidden="true">{tool.icon}</span>
      <div className="tool-card__body">
        <div className="tool-card__meta">
          <span>{tool.category}</span>
          {tool.status && <span className={`status status--${tool.status}`}>{tool.status === "new" ? strings.newBadge : strings.hot}</span>}
        </div>
        <h3><Link href={localePath(locale, `/${tool.slug}/`)} onClick={() => markRecent(tool.slug)}>{tool.name}</Link></h3>
        {locale === "zh" && <small className="tool-card__en">{tool.englishName}</small>}
        <p>{tool.description}</p>
      </div>
      <button
        className={`favorite-button ${favorite ? "is-active" : ""}`}
        type="button"
        aria-label={fill(favorite ? strings.unfavorite : strings.addFavorite, tool.name)}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(tool.slug)}
      >
        {favorite ? "★" : "☆"}
      </button>
      <span className="tool-card__launch" aria-hidden="true">{strings.open} <span>→</span></span>
    </article>
  );
}

export function HomeClient({ tools, categories, locale }: { tools: ToolSummary[]; categories: Array<{ name: string; slug: string }>; locale: Locale }) {
  const strings = homeStrings[locale];
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
            <span>{fill(strings.badge, tools.length)}</span>
            <b aria-hidden="true">→</b>
          </a>
          <h1>{strings.h1a}<br /><span className="gradient-text">{strings.h1b}</span></h1>
          <p className="hero__subtitle">{fill(strings.subtitle, tools.length)}</p>
          <p className="hero__lead">{strings.lead}</p>
          <div className="hero-search" role="search">
            <svg className="hero-search__icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <label className="sr-only" htmlFor="tool-search">{strings.searchLabel}</label>
            <input
              ref={searchRef}
              id="tool-search"
              type="search"
              placeholder={strings.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <kbd aria-hidden="true">/</kbd>
          </div>
          <div className="quick-searches">
            <span>{strings.popular}</span>
            {strings.quickSearches.map((item) => <button key={item} type="button" onClick={() => runQuickSearch(item)}>{item}</button>)}
          </div>
        </div>

        <div className="container hero__shot">
          <div className="app-window">
            <div className="app-window__bar">
              <span className="app-window__dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="app-window__url" aria-hidden="true"><svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>tools.sectools.tw/jwt-decoder</span>
              <span className="app-window__badge" aria-hidden="true"><i className="pulse-dot" />{strings.local}</span>
            </div>
            <div className="app-window__body">
              <nav className="app-window__side" aria-labelledby="popular-title">
                <h2 id="popular-title">{strings.mostUsed}</h2>
                <ol>
                  {popularSlugs.map((slug) => tools.find((tool) => tool.slug === slug)).filter((tool): tool is ToolSummary => Boolean(tool)).map((tool, index) => (
                    <li key={tool.slug}>
                      <Link className={index === 0 ? "is-current" : ""} href={localePath(locale, `/${tool.slug}/`)} onClick={() => markRecent(tool.slug)}>
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
                  <span className="is-ok">{strings.mockOk}</span>
                  <span className="is-warn">{strings.mockWarn}</span>
                  <span>{strings.mockRequests}</span>
                </div>
              </div>
            </div>
          </div>
          <dl className="hero__stats">
            <div><dt>{strings.statTools}</dt><dd>{tools.length}</dd></div>
            <div><dt>{strings.statBytes}</dt><dd>0 B</dd></div>
            <div><dt>{strings.statSignup}</dt><dd>{strings.statSignupValue}</dd></div>
            <div><dt>{strings.statCategories}</dt><dd>{categories.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="tool-library container" id="tools" ref={libraryRef} aria-labelledby="tools-title">
        <div className="section-heading section-heading--center">
          <span className="section-kicker">TOOLS</span>
          <h2 id="tools-title">{strings.toolsTitle}</h2>
          <p>{strings.toolsHintA} <kbd>Ctrl</kbd> + <kbd>K</kbd> {strings.toolsHintB}</p>
        </div>

        <div className="category-tabs" role="group" aria-label={strings.filterLabel}>
          {[allLabel, favoritesLabel, ...categories.map((item) => item.name)].map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "is-active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === favoritesLabel ? strings.favorites : item === allLabel ? strings.all : item}
              <span className="category-tabs__count">{counts.get(item) ?? 0}</span>
            </button>
          ))}
        </div>

        {recentTools.length > 0 && !query && category === allLabel && (
          <div className="recent-strip">
            <span>{strings.recent}</span>
            {recentTools.map((tool) => <Link key={tool.slug} href={localePath(locale, `/${tool.slug}/`)}><b aria-hidden="true">{tool.icon}</b>{tool.name}</Link>)}
          </div>
        )}

        <div className="results-line" aria-live="polite">
          <span><strong>{visibleTools.length}</strong> {strings.count}{query.trim() && <> {fill(strings.matching, query.trim())}</>}</span>
          {(query || category !== allLabel) && <button type="button" onClick={() => { setQuery(""); setCategory(allLabel); }}>{strings.clear}</button>}
        </div>

        {visibleTools.length ? (
          <div className="tool-grid">
            {visibleTools.map((tool) => <ToolCard key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} locale={locale} strings={strings} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>{category === favoritesLabel && !query ? strings.noFavoritesTitle : strings.noResultsTitle}</h3>
            <p>{category === favoritesLabel && !query ? strings.noFavoritesBody : strings.noResultsBody}</p>
            <button type="button" onClick={() => { setQuery(""); setCategory(allLabel); }}>{strings.showAll}</button>
          </div>
        )}
      </section>
    </>
  );
}

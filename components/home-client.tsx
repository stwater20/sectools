"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { categories, type ToolDefinition } from "@/lib/tool-catalog";
import { SiteFooter, SiteHeader } from "./site-shell";

const favoritesKey = "sectools-favorites-v1";
const recentKey = "sectools-recent-v1";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("zh-Hant-TW");
}

function ToolCard({
  tool,
  favorite,
  onFavorite,
  onOpen,
}: {
  tool: ToolDefinition;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="tool-card">
      <div className="tool-card__topline">
        <span className="tool-card__icon" aria-hidden="true">{tool.icon}</span>
        <button
          className={`favorite-button ${favorite ? "is-active" : ""}`}
          type="button"
          aria-label={favorite ? `從收藏移除 ${tool.name}` : `收藏 ${tool.name}`}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="tool-card__body">
        <div className="tool-card__meta">
          <span>{tool.category}</span>
          {tool.status && <span className={`status status--${tool.status}`}>{tool.status === "new" ? "NEW" : "熱門"}</span>}
        </div>
        <h3><Link href={`/tools/${tool.slug}/`} onClick={onOpen}>{tool.name}</Link></h3>
        <p>{tool.description}</p>
      </div>
      <Link className="tool-card__launch" href={`/tools/${tool.slug}/`} onClick={onOpen}>
        開啟工具 <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}

export function HomeClient({ tools }: { tools: ToolDefinition[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("全部");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setFavorites(JSON.parse(localStorage.getItem(favoritesKey) ?? "[]"));
        setRecent(JSON.parse(localStorage.getItem(recentKey) ?? "[]"));
      } catch {
        localStorage.removeItem(favoritesKey);
        localStorage.removeItem(recentKey);
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setQuery("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      active = false;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const visibleTools = useMemo(() => {
    const needle = normalize(query);
    return tools.filter((tool) => {
      const inCategory = category === "全部" || category === "收藏" && favorites.includes(tool.slug) || tool.category === category;
      const haystack = normalize([tool.name, tool.englishName, tool.description, ...tool.tags].join(" "));
      return inCategory && (!needle || haystack.includes(needle));
    });
  }, [tools, query, category, favorites]);

  const recentTools = recent.map((slug) => tools.find((tool) => tool.slug === slug)).filter(Boolean) as ToolDefinition[];

  function toggleFavorite(slug: string) {
    setFavorites((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      localStorage.setItem(favoritesKey, JSON.stringify(next));
      return next;
    });
  }

  function markRecent(slug: string) {
    const next = [slug, ...recent.filter((item) => item !== slug)].slice(0, 4);
    setRecent(next);
    localStorage.setItem(recentKey, JSON.stringify(next));
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero__texture" aria-hidden="true" />
          <div className="container hero__inner">
            <div className="eyebrow"><span /> SECTOOLS.TW OPEN TOOLKIT · 2026</div>
            <h1>真正能用的<br /><em>資安工具箱。</em></h1>
            <p className="hero__lead">為資安工程師、SOC 分析師與開發者打造。免登入、零追蹤，所有資料只在你的瀏覽器裡處理。</p>
            <div className="hero-search">
              <span className="hero-search__icon" aria-hidden="true">⌕</span>
              <label className="sr-only" htmlFor="tool-search">搜尋資安工具</label>
              <input
                ref={searchRef}
                id="tool-search"
                type="search"
                placeholder="搜尋工具、用途或關鍵字…"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>/</kbd>
            </div>
            <div className="hero__trust">
              <span><i className="pulse-dot" /> 本機運算</span>
              <span>無廣告</span>
              <span>無 Cookie 追蹤</span>
              <span>開放原始碼</span>
            </div>
          </div>
        </section>

        <section className="tool-library container" id="tools">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FIELD KIT / 01</span>
              <h2>工具庫</h2>
            </div>
            <p>挑一個工具，資料不會離開這個分頁。</p>
          </div>

          <div className="category-tabs" role="group" aria-label="工具分類">
            {["全部", "收藏", ...categories.map((item) => item.name)].map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "is-active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}{item === "收藏" && favorites.length > 0 ? ` ${favorites.length}` : ""}
              </button>
            ))}
          </div>

          {recentTools.length > 0 && !query && category === "全部" && (
            <div className="recent-strip" aria-label="最近使用">
              <span>最近使用</span>
              {recentTools.map((tool) => <Link key={tool.slug} href={`/tools/${tool.slug}/`}>{tool.name}</Link>)}
            </div>
          )}

          <div className="results-line" aria-live="polite">
            <strong>{visibleTools.length.toString().padStart(2, "0")}</strong> 個工具
            {query && <span>符合「{query}」</span>}
          </div>

          {visibleTools.length ? (
            <div className="tool-grid">
              {visibleTools.map((tool) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  favorite={favorites.includes(tool.slug)}
                  onFavorite={() => toggleFavorite(tool.slug)}
                  onOpen={() => markRecent(tool.slug)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>⌕</span>
              <h3>沒有找到相符工具</h3>
              <p>試試「JWT」、「hash」、「網路」或清除目前篩選。</p>
              <button type="button" onClick={() => { setQuery(""); setCategory("全部"); }}>清除篩選</button>
            </div>
          )}
        </section>

        <section className="privacy-section" id="privacy">
          <div className="container privacy-grid">
            <div className="privacy-stamp" aria-hidden="true"><strong>LOCAL</strong><span>ONLY</span></div>
            <div>
              <span className="section-kicker">PRIVACY BY DESIGN / 02</span>
              <h2>你的資料，<br />不該成為別人的資料。</h2>
            </div>
            <div className="privacy-copy">
              <p>工具使用瀏覽器原生能力完成運算；沒有 API 傳輸、沒有分析腳本，也沒有伺服器紀錄你的輸入。</p>
              <ul>
                <li><span>01</span> 輸入與結果只存在於目前分頁</li>
                <li><span>02</span> 收藏與最近使用僅存於本機</li>
                <li><span>03</span> 原始碼可稽核、可自行部署</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

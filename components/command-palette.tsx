"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { searchTools, type ToolSummary } from "@/lib/search";
import { useFavorites, useRecent } from "@/lib/local-prefs";

export function CommandPalette({ tools }: { tools: ToolSummary[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const favorites = useFavorites();
  const recent = useRecent();

  const results = useMemo(() => {
    if (query.trim()) return searchTools(tools, query).slice(0, 12);
    const pinned = [...recent, ...favorites.filter((slug) => !recent.includes(slug))]
      .map((slug) => tools.find((tool) => tool.slug === slug))
      .filter((tool): tool is ToolSummary => Boolean(tool));
    const rest = tools.filter((tool) => !pinned.includes(tool));
    return [...pinned, ...rest].slice(0, 12);
  }, [tools, query, recent, favorites]);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setQuery("");
    setActive(0);
    dialog.showModal();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      } else if (event.key === "/" && !typing && !document.getElementById("tool-search")) {
        event.preventDefault();
        open();
      }
    };
    const onOpenRequest = () => open();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("sectools-open-search", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("sectools-open-search", onOpenRequest);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(tool: ToolSummary | undefined) {
    if (!tool) return;
    dialogRef.current?.close();
    router.push(`/${tool.slug}/`);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <>
      <button className="search-trigger" type="button" onClick={open} aria-label="搜尋工具（Ctrl+K）">
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
        <span>搜尋工具</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialogRef}
        className="palette"
        aria-label="搜尋工具"
        onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }}
      >
        <div className="palette__panel">
          <div className="palette__search">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              placeholder="輸入工具名稱、英文或用途，例如 jwt、雜湊、cidr…"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={onInputKeyDown}
            />
            <button type="button" className="palette__close" onClick={() => dialogRef.current?.close()}>Esc</button>
          </div>
          {!query.trim() && (recent.length > 0 || favorites.length > 0) && <p className="palette__hint">最近使用與收藏</p>}
          <ul ref={listRef} id={listId} role="listbox" className="palette__list" aria-label="搜尋結果">
            {results.map((tool, index) => (
              <li
                key={tool.slug}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : ""}
                onMouseMove={() => setActive(index)}
                onClick={() => go(tool)}
              >
                <span className="palette__icon" aria-hidden="true">{tool.icon}</span>
                <span className="palette__text">
                  <strong>{tool.name}</strong>
                  <small>{tool.englishName} · {tool.category}</small>
                </span>
                {favorites.includes(tool.slug) && <span className="palette__star" aria-label="已收藏">★</span>}
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="palette__empty">找不到「{query}」。試試英文名稱，例如 base64、ioc、pcap。</p>}
          <div className="palette__footer" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> 選擇</span>
            <span><kbd>Enter</kbd> 開啟</span>
            <span><kbd>Esc</kbd> 關閉</span>
          </div>
        </div>
      </dialog>
    </>
  );
}

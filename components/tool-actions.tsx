"use client";

import { useEffect, useState } from "react";
import { markRecent, toggleFavorite, useFavorites } from "@/lib/local-prefs";

export function ToolActions({ slug, name, strings }: { slug: string; name: string; strings: { favorite: string; favorited: string; share: string; copied: string } }) {
  const favorites = useFavorites();
  const favorite = favorites.includes(slug);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    markRecent(slug);
  }, [slug]);

  async function share() {
    const url = window.location.href.split(/[?#]/)[0];
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      // User dismissed the share sheet or clipboard is unavailable.
    }
  }

  return (
    <div className="tool-actions">
      <button type="button" className={`tool-action ${favorite ? "is-active" : ""}`} aria-pressed={favorite} onClick={() => toggleFavorite(slug)}>
        <span aria-hidden="true">{favorite ? "★" : "☆"}</span>{favorite ? strings.favorited : strings.favorite}
      </button>
      <button type="button" className="tool-action" onClick={share}>
        <span aria-hidden="true">↗</span>{shared ? strings.copied : strings.share}
      </button>
    </div>
  );
}

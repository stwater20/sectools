"use client";

import { useSyncExternalStore } from "react";

export const favoritesKey = "sectools-favorites-v1";
export const recentKey = "sectools-recent-v1";
const changeEvent = "sectools-prefs-change";
const empty: string[] = [];
const cache = new Map<string, { raw: string | null; value: string[] }>();

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return empty;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value;
  let value = empty;
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) value = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    value = empty;
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: preferences simply don't persist.
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function useStoredList(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => empty);
}

export function useFavorites() {
  return useStoredList(favoritesKey);
}

export function useRecent() {
  return useStoredList(recentKey);
}

export function toggleFavorite(slug: string) {
  const current = read(favoritesKey);
  write(favoritesKey, current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
}

export function markRecent(slug: string) {
  const current = read(recentKey);
  if (current[0] === slug) return;
  write(recentKey, [slug, ...current.filter((item) => item !== slug)].slice(0, 6));
}

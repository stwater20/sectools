import type { Metadata } from "next";
import { NotFoundPage } from "@/components/pages/not-found-page";
import { RootDocument, rootMetadata, rootViewport } from "@/components/root-document";
import "./globals.css";

export const metadata: Metadata = { ...rootMetadata("zh"), title: "找不到頁面 · Page not found", robots: { index: false, follow: true } };
export const viewport = rootViewport;

export default function GlobalNotFound() {
  return <RootDocument locale="zh"><NotFoundPage locale="zh" /></RootDocument>;
}

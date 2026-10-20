import { RootDocument, rootMetadata, rootViewport } from "@/components/root-document";
import "../globals.css";

export const metadata = rootMetadata("zh");
export const viewport = rootViewport;

export default function ChineseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="zh">{children}</RootDocument>;
}

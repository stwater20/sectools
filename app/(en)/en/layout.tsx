import { RootDocument, rootMetadata, rootViewport } from "@/components/root-document";
import "../../globals.css";

export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="en">{children}</RootDocument>;
}

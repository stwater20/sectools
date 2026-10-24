import { GuidesIndexPage, guidesIndexMetadata } from "@/components/pages/guide-page";

export const metadata = guidesIndexMetadata("zh");

export default function Page() {
  return <GuidesIndexPage locale="zh" />;
}

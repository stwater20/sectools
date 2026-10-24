import { GuidesIndexPage, guidesIndexMetadata } from "@/components/pages/guide-page";

export const metadata = guidesIndexMetadata("en");

export default function Page() {
  return <GuidesIndexPage locale="en" />;
}

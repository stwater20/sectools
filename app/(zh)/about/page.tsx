import { AboutPage, aboutMetadata } from "@/components/pages/about-page";

export const metadata = aboutMetadata("zh");

export default function Page() {
  return <AboutPage locale="zh" />;
}

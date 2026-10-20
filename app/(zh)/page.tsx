import { HomePage, homeMetadata } from "@/components/pages/home-page";

export const metadata = homeMetadata("zh");

export default function Page() {
  return <HomePage locale="zh" />;
}

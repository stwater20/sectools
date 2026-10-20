import { HomePage, homeMetadata } from "@/components/pages/home-page";

export const metadata = homeMetadata("en");

export default function Page() {
  return <HomePage locale="en" />;
}

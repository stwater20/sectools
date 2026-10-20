import { AboutPage, aboutMetadata } from "@/components/pages/about-page";

export const metadata = aboutMetadata("en");

export default function Page() {
  return <AboutPage locale="en" />;
}

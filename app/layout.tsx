import type { Metadata, Viewport } from "next";
import { siteLocale, siteName, siteUrl } from "@/lib/site";
import { toolCatalog } from "@/lib/tool-catalog";
import "./globals.css";

const toolCount = toolCatalog.length;
const shareTitle = `${siteName}｜${toolCount} 個免費線上資安工具`;
const shareDescription = `${toolCount} 個隱私優先、完全在瀏覽器內運算的免費資安與 CTF 工具：JWT、Hash、CIDR、CVSS、IOC、PCAP 等，免登入、不上傳。`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName}｜免費線上資安工具箱：JWT、Hash、CIDR、CVSS、CTF`,
    template: "%s｜SecTools.tw",
  },
  description: `繁體中文免費線上資安工具箱，提供 ${toolCount} 個 Hash、JWT、IOC、CIDR、CVSS、TOTP、PCAP 與 CTF 工具；所有資料只在瀏覽器本機處理，免登入、不上傳。`,
  applicationName: siteName,
  keywords: [
    "資安工具",
    "線上資安工具",
    "cybersecurity tools",
    "JWT decoder",
    "hash generator",
    "IOC extractor",
    "CVSS calculator",
    "CIDR calculator",
    "TOTP 產生器",
    "IPv6 轉換",
    "Unicode 解碼",
    "CTF 工具",
  ],
  authors: [{ name: "SecTools.tw", url: "https://sectools.tw/" }],
  creator: "SecTools.tw",
  publisher: "SecTools.tw",
  category: "security",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName,
    title: shareTitle,
    description: shareDescription,
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "SecTools.tw 真正能用的資安工具箱" }],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#14191c" },
  ],
  colorScheme: "light dark",
};

// Runs before first paint so a saved dark/light choice never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("sectools-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteLocale} suppressHydrationWarning>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteLocale, siteName, siteUrl } from "@/lib/site";
import { toolCatalog } from "@/lib/tool-catalog";
import "./globals.css";

const inter = localFont({ src: "./fonts/inter-latin-var.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });

const toolCount = toolCatalog.length;
const shareTitle = `${siteName}｜${toolCount} 個免費線上資安工具`;
const shareDescription = `JWT 解碼、Hash、CIDR、CVSS、IOC、PCAP 與 CTF 工具一次收齊。免註冊、無廣告，貼上的內容只在你的電腦上運算。`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName}｜免費線上 JWT、Hash、CIDR、CVSS 與 CTF 工具`,
    template: `%s｜${siteName}`,
  },
  description: `${toolCount} 個免費線上資安工具：JWT 解碼與驗簽、Hash／HMAC、CIDR 與 IPv6 計算、CVSS 評分、IOC 擷取、PCAP 分析與 CTF 解題。免註冊、無廣告，資料全程在瀏覽器處理，不會上傳。`,
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
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: siteName }],
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
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
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
    <html lang={siteLocale} className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

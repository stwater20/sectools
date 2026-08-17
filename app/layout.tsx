import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tools.sectools.tw";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SecTools.tw Toolkit｜免費、隱私優先的資安工具箱",
    template: "%s｜SecTools.tw Toolkit",
  },
  description:
    "給資安工程師、SOC 分析師與開發者的免費線上工具箱。Hash、JWT、IOC、CIDR、CVSS 等工具全程在瀏覽器本機處理。",
  keywords: [
    "資安工具",
    "cybersecurity tools",
    "JWT decoder",
    "hash generator",
    "IOC extractor",
    "CVSS calculator",
    "CIDR calculator",
  ],
  authors: [{ name: "SecTools.tw" }],
  creator: "SecTools.tw",
  publisher: "SecTools.tw",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "SecTools.tw Toolkit",
    title: "SecTools.tw Toolkit｜真正能用的資安工具箱",
    description: "13 個隱私優先、完全在瀏覽器內運算的免費資安工具。",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SecTools.tw 真正能用的資安工具箱" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SecTools.tw Toolkit｜真正能用的資安工具箱",
    description: "13 個隱私優先、完全在瀏覽器內運算的免費資安工具。",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <meta name="theme-color" content="#fbfbfa" />
        <meta name="color-scheme" content="light" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body>{children}</body>
    </html>
  );
}

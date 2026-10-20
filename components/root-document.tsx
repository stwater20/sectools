import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { htmlLang, type Locale } from "@/lib/i18n";
import { siteName, siteUrl } from "@/lib/site";

const inter = localFont({ src: "../app/fonts/inter-latin-var.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });

// Runs before first paint so a saved dark/light choice never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("sectools-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
  colorScheme: "light dark",
};

export function rootMetadata(locale: Locale): Metadata {
  const name = locale === "en" ? "SecTools Security Toolkit" : siteName;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: name, template: locale === "en" ? `%s | ${name}` : `%s｜${name}` },
    applicationName: name,
    authors: [{ name: "SecTools.tw", url: "https://sectools.tw/" }],
    creator: "SecTools.tw",
    publisher: "SecTools.tw",
    category: "security",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    // Search Console / Bing Webmaster ownership tags, set via repository variables at build time.
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export function RootDocument({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={htmlLang[locale]} className={inter.variable} suppressHydrationWarning>
      {/* Rendered by both root layouts (zh and en), so it is effectively layout markup. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/server-api";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

// Refined, friendly sans for the whole app (storefront + admin).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Branding, SEO defaults and search-engine indexing are all driven by Admin →
// Settings / SEO, so the store owner can manage everything without a redeploy.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = (settings["site.name"] as string) || "Best Cool Electronics";
  const tagline = (settings["site.tagline"] as string) || "Genuine Electronics in Bangladesh";
  const siteUrl = getSiteUrl(settings);
  // Single authoritative favicon source: the admin-set one, else the default in
  // /public. (We intentionally do NOT keep app/favicon.ico — its auto-generated
  // <link sizes=... type=...> would out-rank the admin favicon and win in the tab.)
  const favicon = (settings["site.favicon"] as string) || "/favicon.ico";
  const maintenance = settings["maintenance.enabled"] === true;
  // Default: indexable. Admin can flip "site.indexable" off to noindex the site.
  // During maintenance we always noindex so search engines don't cache the notice.
  const indexable = !maintenance && settings["site.indexable"] !== false;

  // Admin-managed SEO defaults (Admin → SEO), with sensible fallbacks.
  const defaultTitle = (settings["seo.defaultTitle"] as string) || `${siteName} — ${tagline}`;
  const template = (settings["seo.titleTemplate"] as string) || `%s — ${siteName}`;
  const description =
    (settings["seo.defaultDescription"] as string) ||
    "Buy 100% authentic smartphones, laptops, smart watches and accessories with official warranty. Fast delivery across Bangladesh.";
  const ogImage = (settings["seo.defaultOgImage"] as string) || (settings["site.logo"] as string) || null;
  const keywordsRaw = (settings["seo.keywords"] as string) || "";
  const keywords = keywordsRaw ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
  const twitterHandle = (settings["seo.twitterHandle"] as string) || undefined;
  const googleV = (settings["seo.googleVerification"] as string) || undefined;
  const bingV = (settings["seo.bingVerification"] as string) || undefined;

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: maintenance
      ? `${(settings["maintenance.title"] as string) || "Under Maintenance"} — ${siteName}`
      : { default: defaultTitle, template },
    description,
    keywords,
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName,
      title: defaultTitle,
      description,
      url: siteUrl,
      locale: "en_US",
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: twitterHandle,
      title: defaultTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    verification: {
      google: googleV,
      other: bingV ? { "msvalidate.01": bingV } : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

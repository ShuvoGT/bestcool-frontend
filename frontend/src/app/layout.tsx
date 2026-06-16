import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/server-api";
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

// Branding (title / favicon) and search-engine indexing are driven by Admin →
// Settings, so the store owner can rebrand without a redeploy.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = (settings["site.name"] as string) || "Best Cool Electronics";
  const tagline = (settings["site.tagline"] as string) || "Genuine Electronics in Bangladesh";
  // Single authoritative favicon source: the admin-set one, else the default in
  // /public. (We intentionally do NOT keep app/favicon.ico — its auto-generated
  // <link sizes=... type=...> would out-rank the admin favicon and win in the tab.)
  const favicon = (settings["site.favicon"] as string) || "/favicon.ico";
  const maintenance = settings["maintenance.enabled"] === true;
  // Default: indexable. Admin can flip "site.indexable" off to noindex the site.
  // During maintenance we always noindex so search engines don't cache the notice.
  const indexable = !maintenance && settings["site.indexable"] !== false;
  const title = maintenance
    ? `${(settings["maintenance.title"] as string) || "Under Maintenance"} — ${siteName}`
    : `${siteName} — ${tagline}`;
  return {
    title,
    description:
      "Buy 100% authentic smartphones, laptops, smart watches and accessories with official warranty. Fast delivery across Bangladesh.",
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    robots: indexable ? undefined : { index: false, follow: false },
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

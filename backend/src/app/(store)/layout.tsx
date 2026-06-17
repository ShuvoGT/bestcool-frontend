import { getSettings, getCategories } from "@/lib/server-api";
import { getSiteUrl, absoluteUrl } from "@/lib/seo";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { MobileBottomNav } from "@/components/store/MobileBottomNav";
import { WhatsAppButton, ChatEmbed } from "@/components/store/FloatingWidgets";
import { Analytics } from "@/components/store/Analytics";
import { CodeSnippets } from "@/components/store/CodeSnippets";
import { MaintenancePage } from "@/components/store/MaintenancePage";
import { JsonLd } from "@/components/seo/JsonLd";
import { Toaster } from "@/components/ui/sonner";

// Render storefront pages at request time (live DB data), not statically at
// build. The data layer queries Prisma directly, which otherwise lets Next
// prerender these pages with build-time data (stale; admin edits wouldn't show).
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // Settings (menu, branding) + product categories both come from the backend,
  // so the header's nav and "Top Categories" list are fully admin-managed.
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  // Maintenance mode: when enabled, every storefront URL shows the notice page
  // instead of the real content. The admin panel (/work) is a separate route
  // group, so staff can still sign in and turn it back off.
  if (settings["maintenance.enabled"] === true) {
    return (
      <MaintenancePage
        siteName={settings["site.name"] ?? "Best Cool Electronics"}
        logo={settings["site.logo"] ?? null}
        title={settings["maintenance.title"] ?? "We'll be right back"}
        message={settings["maintenance.message"] ?? "Our store is undergoing scheduled maintenance. Please check back soon."}
        until={settings["maintenance.until"] ?? null}
      />
    );
  }

  // Site-wide structured data: Organization (brand/logo/socials) + WebSite (with
  // a search action so Google can show a sitelinks search box).
  const base = getSiteUrl(settings);
  const siteName = (settings["site.name"] as string) || "Best Cool Electronics";
  const socials = (settings["social.links"] as { platform: string; url: string }[] | undefined) ?? [];
  const orgLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: (settings["seo.organizationName"] as string) || siteName,
    url: base,
    ...(settings["site.logo"] ? { logo: absoluteUrl(settings["site.logo"] as string, base) } : {}),
    ...(settings["contact.phone"] ? { telephone: settings["contact.phone"] } : {}),
    ...(settings["contact.email"] ? { email: settings["contact.email"] } : {}),
    ...(socials.length ? { sameAs: socials.map((s) => s.url).filter(Boolean) } : {}),
  };
  const websiteLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/shop?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <AuthProvider>
    <StoreProvider>
      <div className="flex min-h-screen flex-col bg-white text-zinc-900">
        <JsonLd data={[orgLd, websiteLd]} />
        <Header settings={settings} categories={categories} />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer settings={settings} />
        <MobileBottomNav />
        <WhatsAppButton number={settings["whatsapp.number"] ?? null} message={settings["whatsapp.message"] ?? null} />
        <ChatEmbed code={settings["chat.embedCode"] ?? null} />
        <Analytics pixelId={settings["analytics.facebookPixelId"] ?? null} ga4Id={settings["analytics.ga4MeasurementId"] ?? null} />
        <CodeSnippets snippets={settings["code.snippets"] ?? []} />
        <Toaster position="bottom-center" richColors />
      </div>
    </StoreProvider>
    </AuthProvider>
  );
}

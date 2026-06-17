"use client";

/**
 * Universal / site-wide SEO settings. Per-page SEO (title, description, OG image)
 * still lives on each CMS page; this manages the defaults, indexing, structured
 * data, social cards, verification and the canonical site URL — all stored as
 * `seo.*` (and `site.indexable`) settings, read by the storefront metadata layer.
 */
import { useState } from "react";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { GlassCard, PageHeader, Spinner } from "@/components/admin/ui";
import { TextField, TextareaField, ImageField, SwitchField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;

export default function AdminSeoPage() {
  const { data: settings, setData: setSettings, loading } = useLoad(() =>
    api<{ settings: Settings }>("/admin/settings").then((r) => r.settings)
  );
  const [saving, setSaving] = useState(false);

  if (loading || !settings) return <Spinner />;

  const get = <T,>(key: string, fallback: T): T => (settings[key] ?? fallback) as T;
  const set = (key: string, value: unknown) => setSettings({ ...settings, [key]: value });

  async function saveAll() {
    setSaving(true);
    try {
      await api("/admin/settings", { method: "PUT", body: settings });
      toast.success("SEO settings saved — live on the storefront");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const siteName = get("site.name", "Best Cool Electronics");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="SEO"
        subtitle="Site-wide search-engine settings — applied instantly, no redeploy"
        actions={
          <Button onClick={saveAll} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save SEO settings
          </Button>
        }
      />

      <div className="space-y-6">
        {/* General defaults */}
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">General defaults</h2>
          <TextField
            label="Default meta title (home page)"
            value={get("seo.defaultTitle", "")}
            onChange={(v) => set("seo.defaultTitle", v)}
            placeholder={`${siteName} — Genuine Electronics in Bangladesh`}
          />
          <TextField
            label="Title template (other pages)"
            value={get("seo.titleTemplate", "")}
            onChange={(v) => set("seo.titleTemplate", v)}
            placeholder={`%s — ${siteName}`}
          />
          <p className="-mt-2 text-xs text-zinc-500">
            <span className="text-zinc-300">%s</span> is replaced by the page name (e.g. a product name). Leave blank to use
            “page — {siteName}”. A page that has its own full SEO title overrides this.
          </p>
          <TextareaField
            label="Default meta description"
            value={get("seo.defaultDescription", "")}
            onChange={(v) => set("seo.defaultDescription", v)}
            rows={3}
            hint="Used when a page has no description of its own. ~150–160 characters is ideal."
          />
          <TextField
            label="Keywords (comma separated, optional)"
            value={get("seo.keywords", "")}
            onChange={(v) => set("seo.keywords", v)}
            placeholder="electronics, smartphone, laptop, bangladesh"
          />
          <ImageField
            label="Default social share image (Open Graph)"
            aspectHint="1200×630"
            value={get("seo.defaultOgImage", "") ?? ""}
            onChange={(v) => set("seo.defaultOgImage", v || null)}
          />
          <p className="-mt-2 text-xs text-zinc-500">Shown when a page is shared on Facebook/WhatsApp/X and has no image of its own. Falls back to your logo.</p>
        </GlassCard>

        {/* Indexing */}
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Search-engine indexing</h2>
          <SwitchField
            label="Allow search engines to index this site"
            checked={get<boolean>("site.indexable", true) !== false}
            onChange={(v) => set("site.indexable", v)}
          />
          <p className="text-xs text-zinc-500">
            Off → a <span className="text-zinc-300">noindex</span> tag + a blocking robots.txt while you build. The admin panel and
            checkout/account pages are always excluded. Maintenance mode also forces noindex.
          </p>
        </GlassCard>

        {/* Social cards */}
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Social cards</h2>
          <TextField
            label="X / Twitter handle"
            value={get("seo.twitterHandle", "")}
            onChange={(v) => set("seo.twitterHandle", v)}
            placeholder="@bestcoolbd"
          />
          <p className="-mt-2 text-xs text-zinc-500">Used for Twitter/X share cards. Open Graph (Facebook/WhatsApp) uses your site name, logo and the share image above.</p>
        </GlassCard>

        {/* Site verification */}
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Site verification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Google Search Console"
              value={get("seo.googleVerification", "")}
              onChange={(v) => set("seo.googleVerification", v)}
              placeholder="content value of the meta tag"
            />
            <TextField
              label="Bing Webmaster Tools"
              value={get("seo.bingVerification", "")}
              onChange={(v) => set("seo.bingVerification", v)}
              placeholder="msvalidate.01 value"
            />
          </div>
          <p className="-mt-2 text-xs text-zinc-500">Paste only the verification code (the <span className="text-zinc-300">content</span> value), not the whole meta tag.</p>
        </GlassCard>

        {/* Canonical + structured data */}
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Canonical &amp; structured data</h2>
          <TextField
            label="Site URL (canonical base)"
            value={get("seo.siteUrl", "")}
            onChange={(v) => set("seo.siteUrl", v)}
            placeholder="https://bestcoolelectronics.com"
          />
          <p className="-mt-2 text-xs text-zinc-500">Used for canonical tags, sitemap and social links. Leave blank to use the server&apos;s configured URL.</p>
          <TextField
            label="Organization name (structured data)"
            value={get("seo.organizationName", "")}
            onChange={(v) => set("seo.organizationName", v)}
            placeholder={siteName}
          />
          <p className="-mt-2 text-xs text-zinc-500">
            Powers Google&apos;s Organization knowledge panel. Logo, phone, email and social links are taken from
            <span className="text-zinc-300"> Settings → General</span>. Product rich-result data (price, rating) is generated automatically.
          </p>
        </GlassCard>

        {/* Sitemap & robots */}
        <GlassCard className="space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Sitemap &amp; robots</h2>
          <p className="text-xs text-zinc-500">Generated automatically from your live products, categories and pages. Submit the sitemap to Google Search Console.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-cyan-300">
              <ExternalLink className="h-3.5 w-3.5" /> View sitemap.xml
            </a>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-cyan-300">
              <ExternalLink className="h-3.5 w-3.5" /> View robots.txt
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/**
 * Shared SEO helpers. The canonical base URL is admin-overridable (seo.siteUrl)
 * and falls back to the deployment env, so canonical/OG/sitemap URLs are correct
 * without a redeploy.
 */
import type { Settings } from "@/lib/server-api";

const FALLBACK_URL = "https://bestcoolelectronics.com";

/** Canonical site origin, without a trailing slash. */
export function getSiteUrl(settings: Settings): string {
  const raw =
    (settings["seo.siteUrl"] as string) ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    FALLBACK_URL;
  return raw.replace(/\/+$/, "");
}

/** Resolve a possibly-relative path/URL to an absolute URL on the given base. */
export function absoluteUrl(pathOrUrl: string | null | undefined, base: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Title for a page: when the admin wrote a full SEO title use it verbatim
 * (bypassing the site-wide template); otherwise return a short title that the
 * root template ("%s — Site Name") will complete.
 */
export function pageTitle(metaTitle: string | null | undefined, fallback: string): { absolute: string } | string {
  return metaTitle ? { absolute: metaTitle } : fallback;
}

/** Strip HTML tags + collapse whitespace, for plain-text meta descriptions. */
export function toPlainText(html: string | null | undefined, max = 300): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

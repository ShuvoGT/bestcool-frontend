import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server-api";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = getSiteUrl(settings);
  const indexable = settings["maintenance.enabled"] !== true && settings["site.indexable"] !== false;

  // When indexing is off (under construction / maintenance) block everything.
  if (!indexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }], sitemap: `${base}/sitemap.xml` };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep admin, API and private account/checkout pages out of search.
        disallow: ["/work", "/api/", "/account", "/checkout", "/cart", "/order-success", "/payment-failed"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/server-api";
import { getSiteUrl } from "@/lib/seo";

// Generated at request time so new products/pages appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const base = getSiteUrl(settings);
  try {
    const [products, categories, pages] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.page.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const now = new Date();
    const entries: MetadataRoute.Sitemap = [
      { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
      { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ];
    for (const p of products) {
      entries.push({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const c of categories) {
      entries.push({ url: `${base}/shop?category=${c.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const pg of pages) {
      if (pg.slug === "home") continue; // home is the root "/" entry above
      entries.push({ url: `${base}/${pg.slug}`, lastModified: pg.updatedAt, changeFrequency: "monthly", priority: 0.5 });
    }
    return entries;
  } catch {
    return [{ url: `${base}/` }];
  }
}

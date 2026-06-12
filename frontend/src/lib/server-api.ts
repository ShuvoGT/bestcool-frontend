/**
 * Server-side API fetchers for storefront Server Components.
 * Always no-store: admin edits must appear on the live site immediately.
 */
import { cache } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Settings = Record<string, any>;

/** Deduped per-request: layout, header, footer and pages all share one call. */
export const getSettings = cache(async (): Promise<Settings> => {
  const res = await get<{ settings: Settings }>("/settings/public");
  return res?.settings ?? {};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CmsBlock = { id: string; type: string; sortOrder: number; content: Record<string, any>; data: any };
export type CmsPage = {
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  blocks: CmsBlock[];
};

export const getPage = cache(async (slug: string): Promise<CmsPage | null> => {
  const res = await get<{ page: CmsPage }>(`/pages/${slug}`);
  return res?.page ?? null;
});

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  regularPrice: number;
  salePrice: number | null;
  price: number;
  discountPercent: number;
  flashSale: { id: string; title: string; endsAt: string; flashPrice: number } | null;
  stock: number;
  soldCount: number;
  image: string | null;
  category: { id: string; name: string; slug: string } | null;
  rating: { average: number; count: number };
  hasVariants: boolean;
};

export type ProductDetailData = ProductCardData & {
  description: string;
  images: { id: string; url: string; alt: string | null }[];
  variants: { id: string; name: string; attributes: Record<string, string>; priceDiff: number; stock: number }[];
};

export async function getProducts(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") params.set(k, String(v));
  return get<{ items: ProductCardData[]; total: number; page: number; pages: number }>(`/products?${params}`);
}

export const getProduct = cache(async (slug: string) => {
  const res = await get<{ product: ProductDetailData }>(`/products/${encodeURIComponent(slug)}`);
  return res?.product ?? null;
});

export async function getRelatedProducts(slug: string) {
  const res = await get<{ items: ProductCardData[] }>(`/products/${encodeURIComponent(slug)}/related`);
  return res?.items ?? [];
}

export async function getReviews(slug: string) {
  const res = await get<{ reviews: { id: string; rating: number; comment: string; author: string; createdAt: string }[] }>(
    `/products/${encodeURIComponent(slug)}/reviews`
  );
  return res?.reviews ?? [];
}

export async function getCategories() {
  const res = await get<{ categories: { id: string; name: string; slug: string; image: string | null; productCount: number }[] }>(
    "/categories"
  );
  return res?.categories ?? [];
}

export type FlashSaleData = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  products: ProductCardData[];
};

export async function getCurrentFlashSale() {
  const res = await get<{ flashSale: FlashSaleData | null }>("/flash-sales/current");
  return res?.flashSale ?? null;
}

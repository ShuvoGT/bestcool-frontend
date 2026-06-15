/**
 * Server-side data access for storefront Server Components.
 *
 * IMPORTANT: this runs in the SAME process as the API route handlers, so it
 * queries the DB DIRECTLY (Prisma) instead of HTTP-fetching our own /api. A
 * self-fetch would deadlock on single-worker hosting (Hostinger/Passenger): the
 * worker rendering the page would block waiting on a request only it can serve.
 *
 * Results are JSON round-tripped so Server Components receive the exact same
 * plain shape (Date→ISO string, Decimal already numbers) the HTTP API returned.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductCard, serializeProductDetail } from "@/server/serializers";
import { enrichBlocks, getCurrentFlashSale as getFlashSale } from "@/server/pages";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

// Convert Date objects (and any non-plain values) to the same JSON shape the
// HTTP API produced, so existing component types keep working unchanged.
// Returns `any` because the JSON round-trip changes types (Date → string), and
// each caller asserts the concrete return type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plain = (v: unknown): any => JSON.parse(JSON.stringify(v));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Settings = Record<string, any>;

const PUBLIC_SETTING_PREFIXES = [
  "site.", "contact.", "social.", "whatsapp.", "chat.", "analytics.", "code.", "nav.", "footer.",
];

/** Deduped per-request: layout, header, footer and pages all share one call. */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const rows = await prisma.setting.findMany();
    const settings: Settings = {};
    for (const row of rows) {
      if (PUBLIC_SETTING_PREFIXES.some((p) => row.key.startsWith(p))) settings[row.key] = row.value;
    }
    return plain(settings);
  } catch {
    return {};
  }
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
  try {
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { blocks: { where: { isEnabled: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!page) return null;
    return plain({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      blocks: await enrichBlocks(page.blocks),
    }) as CmsPage;
  } catch {
    return null;
  }
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
  brand: string | null;
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
  try {
    const category = query.category ? String(query.category) : undefined;
    const brand = query.brand ? String(query.brand) : undefined;
    const search = query.search ? String(query.search) : undefined;
    const minPrice = query.minPrice !== undefined && query.minPrice !== "" ? Number(query.minPrice) : undefined;
    const maxPrice = query.maxPrice !== undefined && query.maxPrice !== "" ? Number(query.maxPrice) : undefined;
    const sort = (query.sort ? String(query.sort) : "newest") as "newest" | "price_asc" | "price_desc" | "popularity";
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
    const brands = brand ? brand.split(",").map((b) => b.trim()).filter(Boolean) : [];

    // MySQL collation is case-insensitive, so `contains` needs no `mode` flag.
    const where = {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(brands.length ? { brand: { in: brands } } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            OR: [
              { salePrice: { not: null, gte: minPrice, lte: maxPrice } },
              { salePrice: null, regularPrice: { gte: minPrice, lte: maxPrice } },
            ],
          }
        : {}),
    };
    const orderBy =
      sort === "price_asc" ? { regularPrice: "asc" as const }
      : sort === "price_desc" ? { regularPrice: "desc" as const }
      : sort === "popularity" ? { soldCount: "desc" as const }
      : { createdAt: "desc" as const };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: productInclude }),
    ]);
    const flashMap = await getRunningFlashMap(products.map((p) => p.id));
    return plain({
      items: products.map((p) => serializeProductCard(p, flashMap.get(p.id))),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    }) as { items: ProductCardData[]; total: number; page: number; pages: number };
  } catch {
    return null;
  }
}

export const getProduct = cache(async (slug: string): Promise<ProductDetailData | null> => {
  try {
    const product = await prisma.product.findFirst({ where: { slug, isActive: true }, include: productInclude });
    if (!product) return null;
    const flashMap = await getRunningFlashMap([product.id]);
    return plain(serializeProductDetail(product, flashMap.get(product.id))) as ProductDetailData;
  } catch {
    return null;
  }
});

export async function getRelatedProducts(slug: string) {
  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return [];
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
      orderBy: { soldCount: "desc" },
      take: 8,
      include: productInclude,
    });
    const flashMap = await getRunningFlashMap(related.map((p) => p.id));
    return plain(related.map((p) => serializeProductCard(p, flashMap.get(p.id)))) as ProductCardData[];
  } catch {
    return [];
  }
}

export async function getReviews(slug: string) {
  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return [];
    const reviews = await prisma.review.findMany({
      where: { productId: product.id, isApproved: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    return plain(
      reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, author: r.user.name, createdAt: r.createdAt })),
    ) as { id: string; rating: number; comment: string; author: string; createdAt: string }[];
  } catch {
    return [];
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    return plain(
      categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, productCount: c._count.products })),
    ) as { id: string; name: string; slug: string; image: string | null; productCount: number }[];
  } catch {
    return [];
  }
}

/** Available brands for the shop "filter by brand", optionally scoped to a category. */
export async function getBrands(category?: string) {
  try {
    const grouped = await prisma.product.groupBy({
      by: ["brand"],
      where: { isActive: true, brand: { not: null }, ...(category ? { category: { slug: category } } : {}) },
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ name: g.brand as string, count: g._count._all }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export type FlashSaleData = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  products: ProductCardData[];
};

export async function getCurrentFlashSale() {
  try {
    return plain(await getFlashSale()) as FlashSaleData | null;
  } catch {
    return null;
  }
}

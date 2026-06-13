import type { PageBlock } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getRunningFlashMap } from "./pricing";
import { serializeProductCard } from "./serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

async function loadProductCards(ids: string[]) {
  if (!ids.length) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: productInclude,
  });
  const flashMap = await getRunningFlashMap(ids);
  // Preserve the admin-chosen ordering from the block content.
  const byId = new Map(products.map((p) => [p.id, serializeProductCard(p, flashMap.get(p.id))]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/** The currently running flash sale with serialized product cards. */
export async function getCurrentFlashSale() {
  const now = new Date();
  const sale = await prisma.flashSale.findFirst({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { endsAt: "asc" },
    include: { products: { include: { product: { include: productInclude } } } },
  });
  if (!sale) return null;
  return {
    id: sale.id,
    title: sale.title,
    startsAt: sale.startsAt,
    endsAt: sale.endsAt,
    products: sale.products
      .filter((fp) => fp.product.isActive)
      .map((fp) =>
        serializeProductCard(fp.product, {
          flashSaleId: sale.id,
          title: sale.title,
          endsAt: sale.endsAt,
          flashPrice: Number(fp.flashPrice),
        })
      ),
  };
}

/**
 * Enriches CMS blocks with live data so the storefront can render each block
 * without extra round-trips: product/category ids are resolved to full
 * objects, and the flash-sale block gets the running campaign.
 */
export async function enrichBlocks(blocks: PageBlock[]) {
  return Promise.all(
    blocks.map(async (block) => {
      const base = {
        id: block.id,
        type: block.type,
        sortOrder: block.sortOrder,
        isEnabled: block.isEnabled,
        content: block.content as Record<string, unknown>,
      };
      switch (block.type) {
        case "FEATURED_PRODUCTS": {
          const ids = ((block.content as any)?.productIds as string[]) ?? [];
          return { ...base, data: { products: await loadProductCards(ids) } };
        }
        case "CATEGORY_PRODUCTS": {
          // A category-scoped, admin-orderable product row. If the admin curated
          // a manual order (productIds), use it; otherwise auto-fill from the
          // category (newest-selling first), limited.
          const content = (block.content as any) ?? {};
          const categoryId = content.categoryId as string | undefined;
          const manualIds = (content.productIds as string[]) ?? [];
          const limit = Math.min(Number(content.limit) || 12, 24);

          let products: unknown[] = [];
          if (manualIds.length) {
            products = (await loadProductCards(manualIds)).slice(0, limit);
          } else if (categoryId) {
            const list = await prisma.product.findMany({
              where: { categoryId, isActive: true },
              orderBy: { soldCount: "desc" },
              take: limit,
              include: productInclude,
            });
            const flashMap = await getRunningFlashMap(list.map((p) => p.id));
            products = list.map((p) => serializeProductCard(p, flashMap.get(p.id)));
          }
          const category = categoryId
            ? await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true, slug: true } })
            : null;
          return { ...base, data: { products, category } };
        }
        case "FEATURED_CATEGORIES": {
          const ids = ((block.content as any)?.categoryIds as string[]) ?? [];
          const categories = await prisma.category.findMany({
            where: ids.length ? { id: { in: ids } } : undefined,
            include: { _count: { select: { products: { where: { isActive: true } } } } },
          });
          const byId = new Map(
            categories.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug, image: c.image, productCount: c._count.products }])
          );
          const ordered = ids.length ? ids.map((id) => byId.get(id)).filter(Boolean) : [...byId.values()];
          return { ...base, data: { categories: ordered } };
        }
        case "FLASH_SALE":
          return { ...base, data: { flashSale: await getCurrentFlashSale() } };
        default:
          return { ...base, data: null };
      }
    })
  );
}

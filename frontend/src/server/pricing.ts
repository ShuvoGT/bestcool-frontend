/**
 * Server-side pricing (ported from backend/src/services/pricing.ts).
 * THE single source of truth for what a product costs right now — flash-sale
 * aware. Client-sent prices are never trusted; cart, checkout and order
 * creation all resolve prices through this module.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FlashInfo = {
  flashSaleId: string;
  title: string;
  endsAt: Date;
  flashPrice: number;
};

/** Returns productId → flash info for campaigns running at this moment. */
export async function getRunningFlashMap(productIds?: string[]): Promise<Map<string, FlashInfo>> {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    include: {
      products: productIds ? { where: { productId: { in: productIds } } } : true,
    },
  });
  const map = new Map<string, FlashInfo>();
  for (const sale of sales) {
    for (const fp of sale.products) {
      map.set(fp.productId, {
        flashSaleId: sale.id,
        title: sale.title,
        endsAt: sale.endsAt,
        flashPrice: Number(fp.flashPrice),
      });
    }
  }
  return map;
}

export type PriceBreakdown = {
  regularPrice: number;
  salePrice: number | null;
  /** Effective base price right now (flash > sale > regular). */
  price: number;
  discountPercent: number;
  flashSale: { id: string; title: string; endsAt: Date; flashPrice: number } | null;
};

export function resolvePrice(
  product: { regularPrice: Prisma.Decimal; salePrice: Prisma.Decimal | null },
  flash?: FlashInfo,
): PriceBreakdown {
  const regularPrice = Number(product.regularPrice);
  const salePrice = product.salePrice !== null ? Number(product.salePrice) : null;
  const price = flash ? flash.flashPrice : salePrice ?? regularPrice;
  return {
    regularPrice,
    salePrice,
    price,
    discountPercent: price < regularPrice ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0,
    flashSale: flash
      ? { id: flash.flashSaleId, title: flash.title, endsAt: flash.endsAt, flashPrice: flash.flashPrice }
      : null,
  };
}

/** Final per-unit price including the variant's price difference. */
export function unitPrice(breakdown: PriceBreakdown, variant?: { priceDiff: Prisma.Decimal } | null): number {
  return breakdown.price + (variant ? Number(variant.priceDiff) : 0);
}

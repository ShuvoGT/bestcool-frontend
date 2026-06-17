import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductCard } from "@/server/serializers";

const querySchema = z.object({
  category: z.string().optional(),
  // Comma-separated brand names (the shop's brand checkboxes).
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popularity"]).default("newest"),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(req: NextRequest) {
  try {
    const { category, brand, minPrice, maxPrice, sort, search, page, limit } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const brands = brand ? brand.split(",").map((b) => b.trim()).filter(Boolean) : [];

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(brands.length ? { brand: { in: brands } } : {}),
      // MySQL string columns use a case-insensitive collation by default, so
      // `contains` matches case-insensitively without Postgres's `mode` flag
      // (which the MySQL connector doesn't support).
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
      // Price range filters compare against the effective base price column
      // approximation (salePrice ?? regularPrice).
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            OR: [
              { salePrice: { not: null, gte: minPrice, lte: maxPrice } },
              { salePrice: null, regularPrice: { gte: minPrice, lte: maxPrice } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" ? { regularPrice: "asc" }
      : sort === "price_desc" ? { regularPrice: "desc" }
      : sort === "popularity" ? { soldCount: "desc" }
      : { createdAt: "desc" };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { images: true, category: true, variants: true, reviews: { select: { rating: true } } },
      }),
    ]);
    const flashMap = await getRunningFlashMap(products.map((p) => p.id));

    return NextResponse.json({
      items: products.map((p) => serializeProductCard(p, flashMap.get(p.id))),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return handleError(err);
  }
}

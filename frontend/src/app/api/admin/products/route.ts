import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sanitizeRichText } from "@/server/sanitize";
import { slugify } from "@/server/slugify";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductCard, serializeProductDetail } from "@/server/serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

const querySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive", "low-stock"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productBody = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().max(200).optional(),
  brand: z.string().max(100).nullable().optional(),
  description: z.string().max(50000).default(""),
  sku: z.string().max(50).nullable().optional(),
  regularPrice: z.number().min(0),
  salePrice: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  categoryId: z.string().min(1),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().max(200).nullable().optional() })).max(20).default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        attributes: z.record(z.string(), z.string()).default({}),
        sku: z.string().max(50).nullable().optional(),
        priceDiff: z.number().default(0),
        stock: z.number().int().min(0).default(0),
      })
    )
    .max(50)
    .default([]),
});

export function validatePrices(body: z.infer<typeof productBody>) {
  if (body.salePrice != null && body.salePrice >= body.regularPrice) {
    throw badRequest("Sale price must be lower than the regular price");
  }
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("products");
    const { search, category, status, page, limit } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const where = {
      ...(search
        ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    };
    let [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(status === "low-stock" ? {} : { skip: (page - 1) * limit, take: limit }),
        include: productInclude,
      }),
    ]);
    // Low-stock compares two columns, which Prisma can't do in WHERE — filter in JS.
    if (status === "low-stock") {
      products = products.filter((p) => p.stock <= p.lowStockThreshold);
      total = products.length;
      products = products.slice((page - 1) * limit, page * limit);
    }
    const flashMap = await getRunningFlashMap(products.map((p) => p.id));
    return NextResponse.json({
      items: products.map((p) => ({
        ...serializeProductCard(p, flashMap.get(p.id)),
        lowStockThreshold: p.lowStockThreshold,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("products");
    const body = productBody.parse(await req.json());
    validatePrices(body);
    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug?.trim() || slugify(body.name),
        brand: body.brand ?? null,
        description: sanitizeRichText(body.description),
        sku: body.sku ?? null,
        regularPrice: body.regularPrice,
        salePrice: body.salePrice ?? null,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        isActive: body.isActive,
        categoryId: body.categoryId,
        images: { create: body.images.map((img, i) => ({ url: img.url, alt: img.alt ?? null, sortOrder: i })) },
        variants: { create: body.variants },
      },
      include: productInclude,
    });
    return NextResponse.json({ product: serializeProductDetail(product) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

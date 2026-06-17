import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sanitizeRichText } from "@/server/sanitize";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductDetail } from "@/server/serializers";
import { productBody, validatePrices } from "../route";

type Ctx = { params: Promise<{ id: string }> };

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products");
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw notFound("Product not found");
    const flashMap = await getRunningFlashMap([product.id]);
    return NextResponse.json({ product: serializeProductDetail(product, flashMap.get(product.id)) });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products");
    const { id } = await params;
    const body = productBody.parse(await req.json());
    validatePrices(body);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw notFound("Product not found");
    // Images and variants are replaced wholesale — the admin editor always
    // submits the complete current set. Past order items keep their snapshots.
    const product = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      await tx.productVariant.deleteMany({ where: { productId: existing.id } });
      return tx.product.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          slug: body.slug?.trim() || existing.slug,
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
    });
    return NextResponse.json({ product: serializeProductDetail(product) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products");
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw notFound("Product not found");
    await prisma.product.delete({ where: { id: existing.id } }); // order items keep snapshots (SetNull)
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

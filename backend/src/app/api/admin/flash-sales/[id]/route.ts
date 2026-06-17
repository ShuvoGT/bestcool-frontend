import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, conflict, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { campaignBody, computedStatus } from "../route";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Spec §9: a product must never sit in two time-overlapping campaigns.
 * Returns the conflicting product names, if any.
 */
async function findOverlapConflicts(
  saleId: string | null,
  startsAt: Date,
  endsAt: Date,
  productIds: string[]
): Promise<string[]> {
  if (!productIds.length) return [];
  const overlapping = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: {
        ...(saleId ? { id: { not: saleId } } : {}),
        isActive: true,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    },
    include: { product: { select: { name: true } }, flashSale: { select: { title: true } } },
  });
  return overlapping.map((o) => `${o.product.name} (already in "${o.flashSale.title}")`);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("flashSales");
    const { id } = await params;
    const sale = await prisma.flashSale.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });
    if (!sale) throw notFound("Flash sale not found");
    return NextResponse.json({
      flashSale: {
        id: sale.id,
        title: sale.title,
        startsAt: sale.startsAt,
        endsAt: sale.endsAt,
        isActive: sale.isActive,
        status: computedStatus(sale),
        products: sale.products.map((fp) => ({
          id: fp.id,
          productId: fp.productId,
          name: fp.product.name,
          slug: fp.product.slug,
          image: fp.product.images[0]?.url ?? null,
          regularPrice: Number(fp.product.regularPrice),
          salePrice: fp.product.salePrice !== null ? Number(fp.product.salePrice) : null,
          flashPrice: Number(fp.flashPrice),
        })),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("flashSales");
    const { id } = await params;
    const body = campaignBody.parse(await req.json());
    const existing = await prisma.flashSale.findUnique({ where: { id }, include: { products: true } });
    if (!existing) throw notFound("Flash sale not found");
    // Changing the window must not create overlaps for products already inside.
    if (body.isActive) {
      const conflicts = await findOverlapConflicts(
        existing.id,
        body.startsAt,
        body.endsAt,
        existing.products.map((p) => p.productId)
      );
      if (conflicts.length) throw conflict(`New schedule overlaps another campaign for: ${conflicts.join(", ")}`);
    }
    const sale = await prisma.flashSale.update({ where: { id: existing.id }, data: body });
    return NextResponse.json({ flashSale: { ...sale, status: computedStatus(sale) } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("flashSales");
    const { id } = await params;
    await prisma.flashSale.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

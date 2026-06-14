import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest, conflict, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";

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

const addBody = z.object({ productId: z.string().min(1), flashPrice: z.number().min(0) });

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("flashSales");
    const { id } = await params;
    const body = addBody.parse(await req.json());
    const sale = await prisma.flashSale.findUnique({ where: { id } });
    if (!sale) throw notFound("Flash sale not found");
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) throw notFound("Product not found");
    if (body.flashPrice >= Number(product.salePrice ?? product.regularPrice)) {
      throw badRequest("Flash price must be lower than the product's current price");
    }
    const conflicts = await findOverlapConflicts(sale.id, sale.startsAt, sale.endsAt, [product.id]);
    if (conflicts.length) throw conflict(`This product is already in an overlapping campaign: ${conflicts.join(", ")}`);

    const entry = await prisma.flashSaleProduct.upsert({
      where: { flashSaleId_productId: { flashSaleId: sale.id, productId: product.id } },
      update: { flashPrice: body.flashPrice },
      create: { flashSaleId: sale.id, productId: product.id, flashPrice: body.flashPrice },
    });
    return NextResponse.json({ entry: { ...entry, flashPrice: Number(entry.flashPrice) } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

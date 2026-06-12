/** Admin flash-sale campaign management (spec §9). */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, badRequest, conflict, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";

export const adminFlashSalesRouter = Router();

function computedStatus(sale: { startsAt: Date; endsAt: Date; isActive: boolean }): "Scheduled" | "Running" | "Ended" | "Inactive" {
  const now = new Date();
  if (!sale.isActive) return "Inactive";
  if (now < sale.startsAt) return "Scheduled";
  if (now > sale.endsAt) return "Ended";
  return "Running";
}

const campaignBody = z
  .object({
    title: z.string().min(2).max(120),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .refine((b) => b.endsAt > b.startsAt, { message: "endsAt must be after startsAt" });

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

adminFlashSalesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sales = await prisma.flashSale.findMany({
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { products: true } } },
    });
    res.json({
      flashSales: sales.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        isActive: s.isActive,
        productCount: s._count.products,
        status: computedStatus(s),
      })),
    });
  })
);

adminFlashSalesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.flashSale.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });
    if (!sale) throw notFound("Flash sale not found");
    res.json({
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
  })
);

adminFlashSalesRouter.post(
  "/",
  validate({ body: campaignBody }),
  asyncHandler(async (req, res) => {
    const sale = await prisma.flashSale.create({ data: req.body });
    res.status(201).json({ flashSale: { ...sale, status: computedStatus(sale) } });
  })
);

adminFlashSalesRouter.put(
  "/:id",
  validate({ body: campaignBody }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.flashSale.findUnique({ where: { id: req.params.id }, include: { products: true } });
    if (!existing) throw notFound("Flash sale not found");
    // Changing the window must not create overlaps for products already inside.
    if (req.body.isActive) {
      const conflicts = await findOverlapConflicts(
        existing.id,
        req.body.startsAt,
        req.body.endsAt,
        existing.products.map((p) => p.productId)
      );
      if (conflicts.length) throw conflict(`New schedule overlaps another campaign for: ${conflicts.join(", ")}`);
    }
    const sale = await prisma.flashSale.update({ where: { id: existing.id }, data: req.body });
    res.json({ flashSale: { ...sale, status: computedStatus(sale) } });
  })
);

adminFlashSalesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.flashSale.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// --- Products inside a campaign ---------------------------------------------
adminFlashSalesRouter.post(
  "/:id/products",
  validate({ body: z.object({ productId: z.string().min(1), flashPrice: z.number().min(0) }) }),
  asyncHandler(async (req, res) => {
    const sale = await prisma.flashSale.findUnique({ where: { id: req.params.id } });
    if (!sale) throw notFound("Flash sale not found");
    const product = await prisma.product.findUnique({ where: { id: req.body.productId } });
    if (!product) throw notFound("Product not found");
    if (req.body.flashPrice >= Number(product.salePrice ?? product.regularPrice)) {
      throw badRequest("Flash price must be lower than the product's current price");
    }
    const conflicts = await findOverlapConflicts(sale.id, sale.startsAt, sale.endsAt, [product.id]);
    if (conflicts.length) throw conflict(`This product is already in an overlapping campaign: ${conflicts.join(", ")}`);

    const entry = await prisma.flashSaleProduct.upsert({
      where: { flashSaleId_productId: { flashSaleId: sale.id, productId: product.id } },
      update: { flashPrice: req.body.flashPrice },
      create: { flashSaleId: sale.id, productId: product.id, flashPrice: req.body.flashPrice },
    });
    res.status(201).json({ entry: { ...entry, flashPrice: Number(entry.flashPrice) } });
  })
);

adminFlashSalesRouter.delete(
  "/:id/products/:productId",
  asyncHandler(async (req, res) => {
    const deleted = await prisma.flashSaleProduct.deleteMany({
      where: { flashSaleId: req.params.id, productId: req.params.productId },
    });
    if (deleted.count === 0) throw notFound("Product is not in this campaign");
    res.json({ ok: true });
  })
);

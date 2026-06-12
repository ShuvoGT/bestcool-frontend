/** Public, read-only endpoints: categories, pages, settings, delivery zones, flash sale. */
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, notFound } from "../lib/errors";
import { enrichBlocks, getCurrentFlashSale } from "../services/pages";

export const categoriesRouter = Router();
categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    res.json({
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, productCount: c._count.products })),
    });
  })
);

export const pagesRouter = Router();
pagesRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({
      where: { slug: req.params.slug },
      include: { blocks: { where: { isEnabled: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!page) throw notFound("Page not found");
    res.json({
      page: {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
        blocks: await enrichBlocks(page.blocks),
      },
    });
  })
);

// Only these settings are exposed to the storefront. Everything else
// (SMS toggles, etc.) stays admin-only.
const PUBLIC_SETTING_PREFIXES = ["site.", "contact.", "social.", "whatsapp.", "chat.", "analytics.", "nav.", "footer."];

export const settingsRouter = Router();
settingsRouter.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      if (PUBLIC_SETTING_PREFIXES.some((p) => row.key.startsWith(p))) settings[row.key] = row.value;
    }
    res.json({ settings });
  })
);

export const deliveryZonesRouter = Router();
deliveryZonesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    res.json({ zones: zones.map((z) => ({ id: z.id, name: z.name, charge: Number(z.charge) })) });
  })
);

export const flashSalesRouter = Router();
flashSalesRouter.get(
  "/current",
  asyncHandler(async (_req, res) => {
    res.json({ flashSale: await getCurrentFlashSale() });
  })
);

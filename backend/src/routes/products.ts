import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, notFound, badRequest } from "../lib/errors";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { getRunningFlashMap } from "../services/pricing";
import { serializeProductCard, serializeProductDetail } from "../services/serializers";
import { sanitizePlainText } from "../utils/sanitize";

export const productsRouter = Router();

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

// --- Shop listing: filters, sorting, search, pagination ---------------------
productsRouter.get(
  "/",
  validate({
    query: z.object({
      category: z.string().optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "popularity"]).default("newest"),
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(48).default(12),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { category, minPrice, maxPrice, sort, search, page, limit } = req.query as unknown as {
      category?: string; minPrice?: number; maxPrice?: number;
      sort: string; search?: string; page: number; limit: number;
    };

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] }
        : {}),
      // Price range filters compare against the effective base price column
      // approximation (salePrice ?? regularPrice). Flash prices are a
      // marketing overlay; range filtering on the listed price is standard.
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
      prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: productInclude }),
    ]);
    const flashMap = await getRunningFlashMap(products.map((p) => p.id));

    res.json({
      items: products.map((p) => serializeProductCard(p, flashMap.get(p.id))),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

// --- Single product ----------------------------------------------------------
productsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: productInclude,
    });
    if (!product) throw notFound("Product not found");
    const flashMap = await getRunningFlashMap([product.id]);
    res.json({ product: serializeProductDetail(product, flashMap.get(product.id)) });
  })
);

// --- Related products --------------------------------------------------------
productsRouter.get(
  "/:slug/related",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) throw notFound("Product not found");
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
      orderBy: { soldCount: "desc" },
      take: 8,
      include: productInclude,
    });
    const flashMap = await getRunningFlashMap(related.map((p) => p.id));
    res.json({ items: related.map((p) => serializeProductCard(p, flashMap.get(p.id))) });
  })
);

// --- Reviews -----------------------------------------------------------------
productsRouter.get(
  "/:slug/reviews",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) throw notFound("Product not found");
    const reviews = await prisma.review.findMany({
      where: { productId: product.id, isApproved: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        author: r.user.name,
        createdAt: r.createdAt,
      })),
    });
  })
);

productsRouter.post(
  "/:slug/reviews",
  requireAuth,
  validate({ body: z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).default("") }) }),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({ where: { slug: req.params.slug, isActive: true } });
    if (!product) throw notFound("Product not found");
    if (req.user!.role === "ADMIN") throw badRequest("Admins cannot review products");
    // One review per customer per product — repeat submissions update it.
    const review = await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: req.user!.id } },
      update: { rating: req.body.rating, comment: sanitizePlainText(req.body.comment) },
      create: {
        productId: product.id,
        userId: req.user!.id,
        rating: req.body.rating,
        comment: sanitizePlainText(req.body.comment),
      },
    });
    res.status(201).json({ review: { id: review.id, rating: review.rating, comment: review.comment } });
  })
);

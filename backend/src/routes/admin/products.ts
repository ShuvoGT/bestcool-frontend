/** Admin product & category management + image uploads. */
import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { prisma } from "../../lib/prisma";
import { asyncHandler, badRequest, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";
import { sanitizeRichText } from "../../utils/sanitize";
import { slugify } from "../../utils/slugify";
import { storage } from "../../storage";
import { getRunningFlashMap } from "../../services/pricing";
import { serializeProductCard, serializeProductDetail } from "../../services/serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export const adminProductsRouter = Router();

adminProductsRouter.get(
  "/",
  validate({
    query: z.object({
      search: z.string().max(100).optional(),
      category: z.string().optional(),
      status: z.enum(["active", "inactive", "low-stock"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { search, category, status, page, limit } = req.query as unknown as {
      search?: string; category?: string; status?: string; page: number; limit: number;
    };
    const where = {
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }] }
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
    res.json({
      items: products.map((p) => ({
        ...serializeProductCard(p, flashMap.get(p.id)),
        lowStockThreshold: p.lowStockThreshold,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

adminProductsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
    if (!product) throw notFound("Product not found");
    const flashMap = await getRunningFlashMap([product.id]);
    res.json({ product: serializeProductDetail(product, flashMap.get(product.id)) });
  })
);

const productBody = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().max(200).optional(),
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

function validatePrices(body: z.infer<typeof productBody>) {
  if (body.salePrice != null && body.salePrice >= body.regularPrice) {
    throw badRequest("Sale price must be lower than the regular price");
  }
}

adminProductsRouter.post(
  "/",
  validate({ body: productBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productBody>;
    validatePrices(body);
    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug?.trim() || slugify(body.name),
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
    res.status(201).json({ product: serializeProductDetail(product) });
  })
);

adminProductsRouter.put(
  "/:id",
  validate({ body: productBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productBody>;
    validatePrices(body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
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
    res.json({ product: serializeProductDetail(product) });
  })
);

adminProductsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Product not found");
    await prisma.product.delete({ where: { id: existing.id } }); // order items keep snapshots (SetNull)
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const adminCategoriesRouter = Router();

const categoryBody = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(100).optional(),
  image: z.string().url().nullable().optional(),
});

adminCategoriesRouter.post(
  "/",
  validate({ body: categoryBody }),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.create({
      data: { name: req.body.name, slug: req.body.slug?.trim() || slugify(req.body.name), image: req.body.image ?? null },
    });
    res.status(201).json({ category });
  })
);

adminCategoriesRouter.put(
  "/:id",
  validate({ body: categoryBody }),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: req.body.name, ...(req.body.slug ? { slug: req.body.slug } : {}), image: req.body.image ?? null },
    });
    res.json({ category });
  })
);

adminCategoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (productCount > 0) throw badRequest(`Cannot delete: ${productCount} product(s) still use this category`);
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// Uploads (goes through the StorageProvider interface — S3-swappable)
// ---------------------------------------------------------------------------
export const adminUploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

adminUploadsRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded (field name: file)");
    const stored = await storage.save(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json(stored);
  })
);

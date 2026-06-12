/** DB-backed cart & wishlist for logged-in users (guests use localStorage). */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, badRequest, notFound } from "../lib/errors";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { getRunningFlashMap, resolvePrice, unitPrice } from "../services/pricing";
import { serializeProductCard } from "../services/serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export const cartRouter = Router();
cartRouter.use(requireAuth);

async function serializeCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { product: { include: productInclude }, variant: true },
  });
  const live = items.filter((i) => i.product.isActive);
  const flashMap = await getRunningFlashMap(live.map((i) => i.productId));
  let subtotal = 0;
  const serialized = live.map((i) => {
    const price = unitPrice(resolvePrice(i.product, flashMap.get(i.productId)), i.variant);
    subtotal += price * i.quantity;
    return {
      id: i.id,
      quantity: i.quantity,
      unitPrice: price,
      lineTotal: price * i.quantity,
      variant: i.variant ? { id: i.variant.id, name: i.variant.name, stock: i.variant.stock } : null,
      product: serializeProductCard(i.product, flashMap.get(i.productId)),
    };
  });
  return { items: serialized, subtotal };
}

cartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await serializeCart(req.user!.id));
  })
);

const cartItemBody = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(99),
});

async function upsertCartItem(userId: string, item: z.infer<typeof cartItemBody>, mode: "add" | "merge") {
  const product = await prisma.product.findFirst({
    where: { id: item.productId, isActive: true },
    include: { variants: true },
  });
  if (!product) throw badRequest("Product is unavailable");
  if (item.variantId && !product.variants.some((v) => v.id === item.variantId)) {
    throw badRequest("Invalid variant");
  }
  if (product.variants.length > 0 && !item.variantId) throw badRequest(`Please select a variant for ${product.name}`);

  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId: item.productId, variantId: item.variantId ?? null },
  });
  if (existing) {
    // "add" stacks quantities; "merge" (login sync) keeps the larger one.
    const quantity = mode === "add" ? existing.quantity + item.quantity : Math.max(existing.quantity, item.quantity);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(quantity, 99) } });
  } else {
    await prisma.cartItem.create({
      data: { userId, productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity },
    });
  }
}

cartRouter.post(
  "/",
  validate({ body: cartItemBody }),
  asyncHandler(async (req, res) => {
    await upsertCartItem(req.user!.id, req.body, "add");
    res.status(201).json(await serializeCart(req.user!.id));
  })
);

// Merges the guest localStorage cart into the DB cart after login.
cartRouter.post(
  "/merge",
  validate({ body: z.object({ items: z.array(cartItemBody).max(100) }) }),
  asyncHandler(async (req, res) => {
    for (const item of req.body.items) {
      await upsertCartItem(req.user!.id, item, "merge").catch(() => undefined); // skip dead products silently
    }
    res.json(await serializeCart(req.user!.id));
  })
);

cartRouter.put(
  "/:itemId",
  validate({ body: z.object({ quantity: z.number().int().min(1).max(99) }) }),
  asyncHandler(async (req, res) => {
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, userId: req.user!.id } });
    if (!item) throw notFound("Cart item not found");
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: req.body.quantity } });
    res.json(await serializeCart(req.user!.id));
  })
);

cartRouter.delete(
  "/:itemId",
  asyncHandler(async (req, res) => {
    await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, userId: req.user!.id } });
    res.json(await serializeCart(req.user!.id));
  })
);

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------
export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { product: { include: productInclude } },
    });
    const flashMap = await getRunningFlashMap(items.map((i) => i.productId));
    res.json({
      items: items.map((i) => ({
        id: i.id,
        addedAt: i.createdAt,
        product: serializeProductCard(i.product, flashMap.get(i.productId)),
      })),
    });
  })
);

wishlistRouter.post(
  "/",
  validate({ body: z.object({ productId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({ where: { id: req.body.productId, isActive: true } });
    if (!product) throw badRequest("Product is unavailable");
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user!.id, productId: product.id } },
      update: {},
      create: { userId: req.user!.id, productId: product.id },
    });
    res.status(201).json({ ok: true });
  })
);

// Merges the guest localStorage wishlist after login.
wishlistRouter.post(
  "/merge",
  validate({ body: z.object({ productIds: z.array(z.string()).max(200) }) }),
  asyncHandler(async (req, res) => {
    const valid = await prisma.product.findMany({
      where: { id: { in: req.body.productIds }, isActive: true },
      select: { id: true },
    });
    for (const { id } of valid) {
      await prisma.wishlistItem.upsert({
        where: { userId_productId: { userId: req.user!.id, productId: id } },
        update: {},
        create: { userId: req.user!.id, productId: id },
      });
    }
    res.json({ ok: true });
  })
);

wishlistRouter.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user!.id, productId: req.params.productId } });
    res.json({ ok: true });
  })
);

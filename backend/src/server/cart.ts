/** Cart helpers shared by the /api/cart route handlers (ported from cartWishlist.ts). */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest } from "./errors";
import { getRunningFlashMap, resolvePrice, unitPrice } from "./pricing";
import { serializeProductCard } from "./serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

export const cartItemBody = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(99),
});

export async function serializeCart(userId: string) {
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

export async function upsertCartItem(
  userId: string,
  item: z.infer<typeof cartItemBody>,
  mode: "add" | "merge",
) {
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

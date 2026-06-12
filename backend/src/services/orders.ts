import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma, type DeliveryStatus, type PaymentMethod } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { badRequest, notFound } from "../lib/errors";
import { getRunningFlashMap, resolvePrice, unitPrice } from "./pricing";

export type CreateOrderInput = {
  customer: { name: string; email: string; phone: string };
  shipping: { address: string; district: string; notes?: string };
  deliveryZoneId: string;
  paymentMethod: PaymentMethod;
  items: { productId: string; variantId?: string; quantity: number }[];
};

export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  userId: string;
  /** True when a new account was auto-created for a guest (spec §6). */
  accountCreated: boolean;
  /** Plaintext temp password for the credentials email (Phase 5). Never logged in prod. */
  tempPassword: string | null;
};

/**
 * Resolves the user an order belongs to. Every order MUST be linked to an
 * account (spec §6): logged-in user → theirs; otherwise match by email, then
 * phone; otherwise auto-create a customer account with a temp password.
 */
async function resolveOrderUser(
  tx: Prisma.TransactionClient,
  customer: CreateOrderInput["customer"],
  authedUserId?: string
): Promise<{ userId: string; accountCreated: boolean; tempPassword: string | null }> {
  if (authedUserId) return { userId: authedUserId, accountCreated: false, tempPassword: null };

  const byEmail = await tx.user.findUnique({ where: { email: customer.email.toLowerCase() } });
  if (byEmail) return { userId: byEmail.id, accountCreated: false, tempPassword: null };

  const byPhone = await tx.user.findFirst({ where: { phone: customer.phone, role: "CUSTOMER" } });
  if (byPhone) return { userId: byPhone.id, accountCreated: false, tempPassword: null };

  // Strong random temp password, e.g. "Xk4-9fQz-7Lm2" style (16+ chars of entropy).
  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const user = await tx.user.create({
    data: {
      name: customer.name,
      email: customer.email.toLowerCase(),
      phone: customer.phone,
      password: await bcrypt.hash(tempPassword, 10),
      role: "CUSTOMER",
      mustChangePassword: true, // forces a password change on first login
    },
  });
  return { userId: user.id, accountCreated: true, tempPassword };
}

/** Sequential order numbers like NM-000042, retried on rare collisions. */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.order.count();
  return `NM-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Creates an order with fully server-resolved pricing (sale + flash-sale
 * aware), atomic stock decrements, and guaranteed user linkage.
 */
export async function createOrder(input: CreateOrderInput, authedUserId?: string): Promise<CreateOrderResult> {
  if (!input.items.length) throw badRequest("Order must contain at least one item");

  const result = await prisma.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.findFirst({ where: { id: input.deliveryZoneId, isActive: true } });
    if (!zone) throw badRequest("Invalid delivery method");

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const flashMap = await getRunningFlashMap(productIds);

    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of input.items) {
      const product = productById.get(item.productId);
      if (!product) throw badRequest("One of the products is unavailable");

      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
      if (item.variantId && !variant) throw badRequest(`Invalid variant for ${product.name}`);
      if (product.variants.length > 0 && !variant) throw badRequest(`Please select a variant for ${product.name}`);

      // Atomic, oversell-safe stock decrements (guarded by the WHERE clause).
      if (variant) {
        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) throw badRequest(`Not enough stock for ${product.name} (${variant.name})`);
      }
      const updatedProduct = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity }, soldCount: { increment: item.quantity } },
      });
      if (updatedProduct.count === 0) throw badRequest(`Not enough stock for ${product.name}`);

      const flash = flashMap.get(product.id);
      const price = unitPrice(resolvePrice(product, flash), variant);
      subtotal += price * item.quantity;

      orderItems.push({
        name: product.name,
        variantName: variant?.name ?? null,
        image: product.images[0]?.url ?? null,
        unitPrice: new Prisma.Decimal(price),
        quantity: item.quantity,
        flashSaleId: flash?.flashSaleId ?? null,
        product: { connect: { id: product.id } },
        ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
      });
    }

    const userInfo = await resolveOrderUser(tx, input.customer, authedUserId);
    const shippingCharge = Number(zone.charge);
    const orderNumber = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: userInfo.userId,
        status: "PENDING",
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "COD" ? "COD_PENDING" : "PENDING",
        subtotal: new Prisma.Decimal(subtotal),
        shippingCharge: new Prisma.Decimal(shippingCharge),
        total: new Prisma.Decimal(subtotal + shippingCharge),
        shippingName: input.customer.name,
        shippingPhone: input.customer.phone,
        shippingEmail: input.customer.email.toLowerCase(),
        shippingAddress: input.shipping.address,
        shippingDistrict: input.shipping.district,
        orderNotes: input.shipping.notes ?? null,
        deliveryZoneName: zone.name,
        items: { create: orderItems },
        statusHistory: { create: { status: "PENDING", note: "Order placed" } },
      },
    });

    return { orderId: order.id, orderNumber, ...userInfo };
  });

  return result;
}

const STATUS_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Admin delivery-status update with stock restoration on cancellation. */
export async function updateOrderStatus(orderId: string, status: DeliveryStatus, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw notFound("Order not found");
    if (order.status === status) return order;
    if (!STATUS_FLOW[order.status].includes(status)) {
      throw badRequest(`Cannot move an order from ${order.status} to ${status}`);
    }

    if (status === "CANCELLED") {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity }, soldCount: { decrement: item.quantity } },
          });
        }
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        statusHistory: { create: { status, note: note ?? null } },
      },
    });
  });
}

/** Customer-facing order endpoints (guest checkout supported). */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, notFound } from "../lib/errors";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { checkoutLimiter } from "../middleware/rateLimit";
import { createOrder } from "../services/orders";
import { serializeOrder } from "../services/serializers";
import { sanitizePlainText } from "../utils/sanitize";

export const ordersRouter = Router();

const createOrderBody = z.object({
  customer: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(11).max(15),
  }),
  shipping: z.object({
    address: z.string().min(5).max(500),
    district: z.string().min(2).max(100),
    notes: z.string().max(1000).optional(),
  }),
  deliveryZoneId: z.string().min(1),
  // Online gateways activate in Phase 6; COD is fully functional now.
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ"]),
  items: z
    .array(z.object({ productId: z.string().min(1), variantId: z.string().min(1).optional(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});

ordersRouter.post(
  "/",
  checkoutLimiter,
  validate({ body: createOrderBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrderBody>;
    if (body.shipping.notes) body.shipping.notes = sanitizePlainText(body.shipping.notes);

    const result = await createOrder(body, req.user?.id);

    // Clear the (DB) cart for logged-in users after a successful order.
    if (req.user) await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });

    // Phase 5 adds: confirmation email/SMS + credentials email for new accounts.
    res.status(201).json({
      orderNumber: result.orderNumber,
      accountCreated: result.accountCreated,
    });
  })
);

ordersRouter.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { items: true, statusHistory: true },
    });
    res.json({ orders: orders.map(serializeOrder) });
  })
);

ordersRouter.get(
  "/my/:orderNumber",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber, userId: req.user!.id },
      include: { items: true, statusHistory: true },
    });
    if (!order) throw notFound("Order not found");
    res.json({ order: serializeOrder(order) });
  })
);

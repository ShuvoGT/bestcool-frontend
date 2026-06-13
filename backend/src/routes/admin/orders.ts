/** Admin order management, customer list, and dashboard stats. */
import { Router } from "express";
import { z } from "zod";
import { DeliveryStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";
import { updateOrderStatus } from "../../services/orders";
import { notifyPaymentConfirmed, notifyStatusChange } from "../../services/notifications";
import { reconcilePendingPayments } from "../../services/payments";
import { sendToCourier, refreshCourierStatus } from "../../services/couriers";
import { serializeOrder } from "../../services/serializers";

export const adminOrdersRouter = Router();

adminOrdersRouter.get(
  "/",
  validate({
    query: z.object({
      status: z.nativeEnum(DeliveryStatus).optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
      paymentStatus: z.nativeEnum(PaymentStatus).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      status?: DeliveryStatus; paymentMethod?: PaymentMethod; paymentStatus?: PaymentStatus;
      from?: Date; to?: Date; search?: string; page: number; limit: number;
    };
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.from || q.to ? { createdAt: { gte: q.from, lte: q.to } } : {}),
      ...(q.search
        ? {
            OR: [
              { orderNumber: { contains: q.search, mode: "insensitive" } },
              { shippingPhone: { contains: q.search } },
              { shippingEmail: { contains: q.search, mode: "insensitive" } },
              { shippingName: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { items: true, statusHistory: true },
      }),
    ]);
    res.json({ items: orders.map(serializeOrder), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
  })
);

adminOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, statusHistory: true, user: { select: { id: true, name: true, email: true } }, transactions: true },
    });
    if (!order) throw notFound("Order not found");
    res.json({
      order: {
        ...serializeOrder(order),
        customer: order.user,
        transactions: order.transactions.map((t) => ({
          id: t.id,
          provider: t.provider,
          amount: Number(t.amount),
          status: t.status,
          gatewayTransactionId: t.gatewayTransactionId,
          createdAt: t.createdAt,
        })),
      },
    });
  })
);

// Delivery status update — Phase 5 hooks customer email/SMS into this.
adminOrdersRouter.put(
  "/:id/status",
  validate({ body: z.object({ status: z.nativeEnum(DeliveryStatus), note: z.string().max(500).optional() }) }),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(req.params.id, req.body.status, req.body.note);
    // Customer email + SMS — fire-and-forget.
    void notifyStatusChange(order.id, order.status);
    res.json({ order: { id: order.id, status: order.status } });
  })
);

// Send an order to a courier (spec §11). Creates the consignment, saves the
// tracking id, and auto-advances the order to SHIPPED (fires email/SMS).
adminOrdersRouter.post(
  "/:id/send-to-courier",
  validate({
    body: z.object({
      courier: z.enum(["STEADFAST", "PATHAO", "REDX"]),
      recipientName: z.string().min(2).max(100),
      recipientPhone: z.string().min(11).max(15),
      recipientAddress: z.string().min(5).max(500),
      recipientCity: z.string().min(2).max(100),
      recipientZone: z.string().max(100).optional(),
      codAmount: z.number().min(0),
      weightKg: z.number().min(0).max(50).optional(),
      note: z.string().max(500).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await sendToCourier(req.params.id, req.body);
    res.json(result);
  })
);

// Pull the latest parcel status from the courier API.
adminOrdersRouter.post(
  "/:id/refresh-courier",
  asyncHandler(async (req, res) => {
    res.json(await refreshCourierStatus(req.params.id));
  })
);

// Manually run the payment reconciliation sweep (bKash/Nagad orders whose
// browser redirect never landed). Also runs automatically every 5 minutes.
adminOrdersRouter.post(
  "/reconcile-payments",
  asyncHandler(async (_req, res) => {
    res.json(await reconcilePendingPayments());
  })
);

// Manual payment status update / verification (e.g. confirming a COD payment).
adminOrdersRouter.put(
  "/:id/payment-status",
  validate({ body: z.object({ paymentStatus: z.nativeEnum(PaymentStatus), note: z.string().max(500).optional() }) }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Order not found");
    const order = await prisma.order.update({
      where: { id: existing.id },
      data: {
        paymentStatus: req.body.paymentStatus,
        ...(req.body.paymentStatus === "PAID" && !existing.paidAt ? { paidAt: new Date() } : {}),
        statusHistory: {
          create: { status: `PAYMENT_${req.body.paymentStatus}`, note: req.body.note ?? "Payment status updated by admin" },
        },
      },
    });
    if (req.body.paymentStatus === "PAID") void notifyPaymentConfirmed(order.id);
    res.json({ order: { id: order.id, paymentStatus: order.paymentStatus } });
  })
);

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export const adminCustomersRouter = Router();

adminCustomersRouter.get(
  "/",
  validate({
    query: z.object({
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { search?: string; page: number; limit: number };
    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { email: { contains: q.search, mode: "insensitive" } },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
      }),
    ]);
    res.json({
      items: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        joinedAt: c.createdAt,
        totalOrders: c._count.orders,
      })),
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    });
  })
);

// ---------------------------------------------------------------------------
// Dashboard stats (admin home)
// ---------------------------------------------------------------------------
export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const revenueWhere = { paymentStatus: { in: ["PAID", "COD_PENDING"] as PaymentStatus[] }, status: { not: "CANCELLED" as DeliveryStatus } };

    const [todayOrders, todayRevenue, totalRevenue, totalOrders, totalCustomers, recentOrders, products] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.aggregate({ where: { ...revenueWhere, createdAt: { gte: startOfToday } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: revenueWhere, _sum: { total: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true, statusHistory: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, stock: true, lowStockThreshold: true } }),
    ]);

    res.json({
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.total ?? 0),
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      totalOrders,
      totalCustomers,
      recentOrders: recentOrders.map(serializeOrder),
      lowStockProducts: products.filter((p) => p.stock <= p.lowStockThreshold),
    });
  })
);

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DeliveryStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { serializeOrder } from "@/server/serializers";

const querySchema = z.object({
  status: z.nativeEnum(DeliveryStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("orders");
    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.from || q.to ? { createdAt: { gte: q.from, lte: q.to } } : {}),
      ...(q.search
        ? {
            OR: [
              { orderNumber: { contains: q.search } },
              { shippingPhone: { contains: q.search } },
              { shippingEmail: { contains: q.search } },
              { shippingName: { contains: q.search } },
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
    return NextResponse.json({ items: orders.map(serializeOrder), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
  } catch (err) {
    return handleError(err);
  }
}

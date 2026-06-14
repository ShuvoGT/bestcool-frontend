import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

const querySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("customers");
    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { email: { contains: q.search } },
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
    return NextResponse.json({
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
  } catch (err) {
    return handleError(err);
  }
}

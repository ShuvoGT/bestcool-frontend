import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { serializeOrder } from "@/server/serializers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("orders");
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, statusHistory: true, user: { select: { id: true, name: true, email: true } }, transactions: true },
    });
    if (!order) throw notFound("Order not found");
    return NextResponse.json({
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
  } catch (err) {
    return handleError(err);
  }
}

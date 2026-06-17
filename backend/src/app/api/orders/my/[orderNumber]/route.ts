import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { serializeOrder } from "@/server/serializers";

type Ctx = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { orderNumber } = await params;
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId: user.id },
      include: { items: true, statusHistory: true },
    });
    if (!order) throw notFound("Order not found");
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (err) {
    return handleError(err);
  }
}

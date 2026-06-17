import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { initiatePayment } from "@/server/payments";

type Ctx = { params: Promise<{ orderNumber: string }> };

// Re-start a payment for an existing unpaid online order (retry / "Pay now").
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { orderNumber } = await params;
    const order = await prisma.order.findFirst({ where: { orderNumber, userId: user.id } });
    if (!order) throw notFound("Order not found");
    const result = await initiatePayment(order.orderNumber);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

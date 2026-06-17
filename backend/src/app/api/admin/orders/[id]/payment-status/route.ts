import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { notifyPaymentConfirmed } from "@/server/notifications";

type Ctx = { params: Promise<{ id: string }> };

const paymentStatusBody = z.object({ paymentStatus: z.nativeEnum(PaymentStatus), note: z.string().max(500).optional() });

// Manual payment status update / verification (e.g. confirming a COD payment).
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("orders");
    const { id } = await params;
    const body = paymentStatusBody.parse(await req.json());
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw notFound("Order not found");
    const order = await prisma.order.update({
      where: { id: existing.id },
      data: {
        paymentStatus: body.paymentStatus,
        ...(body.paymentStatus === "PAID" && !existing.paidAt ? { paidAt: new Date() } : {}),
        statusHistory: {
          create: { status: `PAYMENT_${body.paymentStatus}`, note: body.note ?? "Payment status updated by admin" },
        },
      },
    });
    if (body.paymentStatus === "PAID") void notifyPaymentConfirmed(order.id);
    return NextResponse.json({ order: { id: order.id, paymentStatus: order.paymentStatus } });
  } catch (err) {
    return handleError(err);
  }
}

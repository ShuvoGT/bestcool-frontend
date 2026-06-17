import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DeliveryStatus } from "@prisma/client";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { updateOrderStatus } from "@/server/orders";
import { notifyStatusChange } from "@/server/notifications";

type Ctx = { params: Promise<{ id: string }> };

const statusBody = z.object({ status: z.nativeEnum(DeliveryStatus), note: z.string().max(500).optional() });

// Delivery status update — Phase 5 hooks customer email/SMS into this.
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("orders");
    const { id } = await params;
    const body = statusBody.parse(await req.json());
    const order = await updateOrderStatus(id, body.status, body.note);
    // Customer email + SMS — fire-and-forget.
    void notifyStatusChange(order.id, order.status);
    return NextResponse.json({ order: { id: order.id, status: order.status } });
  } catch (err) {
    return handleError(err);
  }
}

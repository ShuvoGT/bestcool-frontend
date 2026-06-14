import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { serializeOrder } from "@/server/serializers";

export async function GET() {
  try {
    const user = await requireAuth();
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true, statusHistory: true },
    });
    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (err) {
    return handleError(err);
  }
}

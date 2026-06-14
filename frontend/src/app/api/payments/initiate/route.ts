import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { getAuthUser } from "@/server/auth";
import { initiatePayment, verifyPaymentToken } from "@/server/payments";

const schema = z.object({ orderNumber: z.string().min(1), paymentToken: z.string().optional() });

// Start a gateway session for an existing order. Authorised either by the
// order's owner (logged-in) or by the unforgeable payment token handed back at
// order creation — this prevents order-number enumeration / IDOR.
export async function POST(req: NextRequest) {
  try {
    const { orderNumber, paymentToken } = schema.parse(await req.json());
    const user = await getAuthUser();
    const owned =
      user && (await prisma.order.findFirst({ where: { orderNumber, userId: user.id }, select: { id: true } }));
    if (!owned && !(paymentToken && verifyPaymentToken(orderNumber, paymentToken))) {
      return NextResponse.json({ error: "Not authorised to pay for this order" }, { status: 403 });
    }
    const result = await initiatePayment(orderNumber);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

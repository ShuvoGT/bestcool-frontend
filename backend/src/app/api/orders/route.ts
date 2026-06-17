import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { getAuthUser } from "@/server/auth";
import { createOrder } from "@/server/orders";
import { notifyOrderPlaced } from "@/server/notifications";
import { paymentToken } from "@/server/payments";
import { sanitizePlainText } from "@/server/sanitize";
import { checkoutLimit } from "@/server/rateLimit";

const createOrderBody = z.object({
  customer: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(11).max(15),
  }),
  shipping: z.object({
    address: z.string().min(5).max(500),
    district: z.string().min(2).max(100),
    notes: z.string().max(1000).optional(),
  }),
  deliveryZoneId: z.string().min(1),
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ"]),
  items: z
    .array(z.object({ productId: z.string().min(1), variantId: z.string().min(1).optional(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  try {
    checkoutLimit(req);
    // Guest checkout is allowed — an account is auto-created when needed.
    const authUser = await getAuthUser();
    const body = createOrderBody.parse(await req.json());
    if (body.shipping.notes) body.shipping.notes = sanitizePlainText(body.shipping.notes);

    const result = await createOrder(body, authUser?.id);

    // Clear the (DB) cart for logged-in users after a successful order.
    if (authUser) await prisma.cartItem.deleteMany({ where: { userId: authUser.id } });

    // Confirmation email/SMS — fire-and-forget; never delays/breaks placement.
    void notifyOrderPlaced(result.orderId, result.tempPassword);

    return NextResponse.json(
      {
        orderNumber: result.orderNumber,
        accountCreated: result.accountCreated,
        paymentMethod: body.paymentMethod,
        // Authorises the immediate /payments/initiate call for guests (no login).
        paymentToken: body.paymentMethod === "COD" ? undefined : paymentToken(result.orderNumber),
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}

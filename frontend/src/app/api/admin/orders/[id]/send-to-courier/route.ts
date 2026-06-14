import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sendToCourier } from "@/server/couriers";

type Ctx = { params: Promise<{ id: string }> };

const courierBody = z.object({
  courier: z.enum(["STEADFAST", "PATHAO", "REDX"]),
  recipientName: z.string().min(2).max(100),
  recipientPhone: z.string().min(11).max(15),
  recipientAddress: z.string().min(5).max(500),
  recipientCity: z.string().min(2).max(100),
  recipientZone: z.string().max(100).optional(),
  codAmount: z.number().min(0),
  weightKg: z.number().min(0).max(50).optional(),
  note: z.string().max(500).optional(),
});

// Send an order to a courier (spec §11). Creates the consignment, saves the
// tracking id, and auto-advances the order to SHIPPED (fires email/SMS).
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("orders");
    const { id } = await params;
    const body = courierBody.parse(await req.json());
    const result = await sendToCourier(id, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

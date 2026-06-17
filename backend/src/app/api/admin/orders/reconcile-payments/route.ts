import { NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { reconcilePendingPayments } from "@/server/payments";

// Manually run the payment reconciliation sweep (bKash/Nagad orders whose
// browser redirect never landed). Also runs automatically every 5 minutes.
export async function POST() {
  try {
    await requirePermission("orders");
    return NextResponse.json(await reconcilePendingPayments());
  } catch (err) {
    return handleError(err);
  }
}

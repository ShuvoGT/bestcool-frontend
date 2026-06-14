import { NextResponse } from "next/server";
import type { PaymentMethod } from "@prisma/client";
import { handleError } from "@/server/errors";
import { loadPaymentConfig } from "@/server/payments/config";
import { listOnlineMethods } from "@/server/payments/providers";

const LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  SSLCOMMERZ: "Card / Net Banking (SSLCommerz)",
};

// COD is always available; an online gateway appears ONLY when configured in
// admin Settings (or env) — unconfigured gateways are hidden from checkout.
export async function GET() {
  try {
    const cfg = await loadPaymentConfig();
    const online = listOnlineMethods(cfg)
      .filter((m) => m.configured)
      .map((m) => ({ method: m.method, label: LABELS[m.method] }));
    return NextResponse.json({ methods: [{ method: "COD", label: LABELS.COD }, ...online] });
  } catch (err) {
    return handleError(err);
  }
}

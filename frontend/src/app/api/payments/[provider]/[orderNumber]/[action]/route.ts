/**
 * Gateway callbacks & IPN (ported from backend/src/routes/payments.ts).
 * One dynamic route handles every provider's redirect endpoints:
 *   /api/payments/{bkash|nagad|sslcommerz}/{orderNumber}/{callback|success|fail|cancel|ipn}
 *
 * Redirect actions verify SERVER-SIDE then 303-redirect the customer to a
 * storefront result page. The `ipn` action returns plain JSON to the gateway.
 * All settlement goes through verifyAndSettle.
 */
import { NextRequest, NextResponse } from "next/server";
import type { PaymentMethod } from "@prisma/client";
import { verifyAndSettle } from "@/server/payments";
import { handleError } from "@/server/errors";
import { callbackLimit } from "@/server/rateLimit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const PROVIDER_BY_SLUG: Record<string, PaymentMethod> = {
  bkash: "BKASH",
  nagad: "NAGAD",
  sslcommerz: "SSLCOMMERZ",
};

function storefrontResult(outcome: string, orderNumber: string): string {
  const o = encodeURIComponent(orderNumber);
  if (outcome === "PAID") return `${SITE_URL}/order-success?order=${o}&paid=1`;
  if (outcome === "CANCELLED") return `${SITE_URL}/payment-failed?order=${o}&reason=cancelled`;
  // PENDING still lands on a non-error page — reconcile/IPN finalises it.
  if (outcome === "PENDING") return `${SITE_URL}/order-success?order=${o}&pending=1`;
  return `${SITE_URL}/payment-failed?order=${o}&reason=failed`;
}

/** Merge query params with the request body (form-urlencoded or JSON). */
async function readParams(req: NextRequest): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = {};
  for (const [k, v] of req.nextUrl.searchParams) params[k] = v;
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) {
        Object.assign(params, await req.json());
      } else {
        const form = await req.formData();
        for (const [k, v] of form) params[k] = typeof v === "string" ? v : v.name;
      }
    } catch {
      // no/unparseable body — query params alone may suffice
    }
  }
  return params;
}

type Ctx = { params: Promise<{ provider: string; orderNumber: string; action: string }> };

async function handle(req: NextRequest, { params }: Ctx) {
  try {
    callbackLimit(req);
  } catch (err) {
    return handleError(err);
  }
  const { provider, orderNumber, action } = await params;
  const method = PROVIDER_BY_SLUG[provider.toLowerCase()];
  if (!method) {
    return NextResponse.json({ error: "Unknown payment provider" }, { status: 400 });
  }
  const requestParams = await readParams(req);

  // Server-to-server IPN/webhook — verified the same way; returns plain status.
  if (action === "ipn") {
    try {
      const settled = await verifyAndSettle(method, orderNumber, requestParams);
      return NextResponse.json({ ok: true, outcome: settled.outcome }, { status: 200 });
    } catch (err) {
      console.error(`IPN verify failed for ${method} ${orderNumber}:`, err);
      return NextResponse.json({ ok: false }, { status: 400 });
    }
  }

  // Customer-facing redirect endpoints (callback/success/fail/cancel).
  let outcome = "FAILED";
  try {
    const settled = await verifyAndSettle(method, orderNumber, requestParams);
    outcome = settled.outcome;
  } catch (err) {
    console.error(`Payment callback verify failed for ${method} ${orderNumber}:`, err);
  }
  // 303 → the browser follows with a GET even if the gateway POSTed here.
  return NextResponse.redirect(storefrontResult(outcome, orderNumber), 303);
}

export const GET = handle;
export const POST = handle;

/**
 * Public courier webhook (ported from backend/src/routes/couriers.ts).
 * POST /api/couriers/{steadfast|pathao|redx}/webhook — push status updates.
 *
 * Verified server-side via a shared secret (COURIER_WEBHOOK_SECRET): the courier
 * must present it as ?secret=… or an X-Webhook-Secret header. Updates are matched
 * to an order by consignment id, so a body alone can't move an unrelated order.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { CourierName } from "@prisma/client";
import { applyCourierWebhook } from "@/server/couriers";
import { handleError } from "@/server/errors";
import { callbackLimit } from "@/server/rateLimit";

const PROVIDER_BY_SLUG: Record<string, CourierName> = {
  steadfast: "STEADFAST",
  pathao: "PATHAO",
  redx: "REDX",
};

function timingSafeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    callbackLimit(req);
  } catch (err) {
    return handleError(err);
  }
  const { provider } = await params;
  const courier = PROVIDER_BY_SLUG[(provider || "").toLowerCase()];
  if (!courier) return NextResponse.json({ error: "Unknown courier" }, { status: 400 });

  // Verify the shared secret before trusting anything in the body.
  const secret = process.env.COURIER_WEBHOOK_SECRET || "";
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-webhook-secret") || "";
  if (!secret || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  // Merge query + body (couriers post form-urlencoded or JSON).
  const body: Record<string, unknown> = {};
  for (const [k, v] of req.nextUrl.searchParams) body[k] = v;
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      Object.assign(body, await req.json());
    } else {
      const form = await req.formData();
      for (const [k, v] of form) body[k] = typeof v === "string" ? v : v.name;
    }
  } catch {
    // query params alone may suffice
  }

  try {
    const result = await applyCourierWebhook(courier, body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(`Courier webhook failed for ${courier}:`, err);
    return NextResponse.json({ applied: false }, { status: 400 });
  }
}

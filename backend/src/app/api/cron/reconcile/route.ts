/**
 * Payment reconciliation trigger for shared hosting.
 *
 * The Express app ran reconcilePendingPayments() on a setInterval; shared
 * hosting (Hostinger/Passenger) can't keep a background timer alive. Instead,
 * point a Hostinger Cron Job at this endpoint every ~5 minutes:
 *   curl -fsS "https://yourdomain/api/cron/reconcile?secret=$CRON_SECRET"
 *
 * Protected by CRON_SECRET (constant-time compare). If CRON_SECRET is unset the
 * endpoint is disabled (fail closed) so it can never be triggered anonymously.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { reconcilePendingPayments } from "@/server/payments";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false; // disabled until configured
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await reconcilePendingPayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Reconcile cron failed:", err);
    return NextResponse.json({ ok: false, error: "Reconcile failed" }, { status: 500 });
  }
}

// Accept GET (simplest for cron `curl`) and POST.
export const GET = run;
export const POST = run;

/**
 * In-memory rate limiting (replaces the Express express-rate-limit middleware
 * that wasn't ported). Fixed-window, keyed by client IP + bucket name.
 *
 * Hostinger shared hosting runs the app as a SINGLE Node process (Passenger),
 * so a process-local Map is an effective limiter here — no Redis needed. (If the
 * app is ever scaled to multiple processes, swap this for a shared store.)
 */
import type { NextRequest } from "next/server";
import { AppError } from "./errors";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

// Drop expired buckets occasionally so the Map can't grow unbounded.
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** Best-effort client IP. Behind Hostinger/Passenger the real IP is in XFF. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * Fixed-window limiter. Throws AppError(429) when the caller exceeds `limit`
 * requests within `windowMs`. handleError() turns that into a 429 JSON response.
 */
export function rateLimit(
  req: NextRequest,
  name: string,
  limit: number,
  windowMs: number = FIFTEEN_MIN,
  message?: string,
): void {
  const now = Date.now();
  sweep(now);
  const key = `${name}:${clientIp(req)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) {
    const mins = Math.max(1, Math.ceil((b.resetAt - now) / 60000));
    throw new AppError(429, message ?? `Too many requests, please try again in ${mins} minute(s).`);
  }
}

// Mirrors the original Express limiters (backend/src/middleware/rateLimit.ts).
/** Login / register / password endpoints — brute-force protection (20 / 15 min). */
export const authLimit = (req: NextRequest) =>
  rateLimit(req, "auth", 20, FIFTEEN_MIN, "Too many attempts, please try again in 15 minutes.");
/** Order placement / payment initiation — abuse protection (15 / 15 min). */
export const checkoutLimit = (req: NextRequest) =>
  rateLimit(req, "checkout", 15, FIFTEEN_MIN, "Too many orders placed, please try again later.");
/** Payment & courier callbacks/webhooks — lenient (120 / 15 min). */
export const callbackLimit = (req: NextRequest) => rateLimit(req, "callback", 120, FIFTEEN_MIN, "Too many requests.");

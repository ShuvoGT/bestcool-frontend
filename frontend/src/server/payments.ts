/**
 * Payments — PARTIAL. Step 7 of the consolidation ports the real gateway
 * integrations (bKash/Nagad/SSLCommerz) from backend/src/payments/* and
 * services/payments.ts. COD checkout needs none of this and works fully today.
 *
 * `paymentToken` is the real (small) primitive: an HMAC over the order number
 * that authorises a guest's immediate /payments/initiate call without a login.
 * Step 7's initiate endpoint will verify it with the same secret.
 */
import crypto from "crypto";
import { AppError } from "./errors";

function secret(): string {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function paymentToken(orderNumber: string): string {
  return crypto.createHmac("sha256", secret()).update(orderNumber).digest("base64url");
}

export function verifyPaymentToken(orderNumber: string, token: string): boolean {
  const expected = paymentToken(orderNumber);
  // Constant-time compare; lengths match by construction.
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function initiatePayment(_orderNumber: string): Promise<never> {
  throw new AppError(501, "Online payments are not configured yet — use Cash on Delivery.");
}

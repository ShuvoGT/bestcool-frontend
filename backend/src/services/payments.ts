/**
 * Payment orchestration (spec §5): start a gateway session for an order, and
 * settle an order from a verified gateway result — idempotently and safely.
 *
 * Hard rules enforced here:
 *  - An order is marked PAID only after provider.verify() (a server-to-server
 *    check against the gateway), never from a raw client redirect.
 *  - The callback provider MUST match the order's payment method, and the
 *    gateway's echoed merchant order id MUST match the order (anti
 *    cross-order-replay — enforced inside each provider's verify()).
 *  - A PAID outcome is accepted only with a confirmed numeric amount that
 *    matches the order total (fail closed when the amount is absent).
 *  - All status writes are guarded so a late FAILED can never clobber a PAID,
 *    and settlement + notification happen exactly once.
 */
import crypto from "crypto";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError, badRequest, notFound } from "../lib/errors";
import { env } from "../config/env";
import { getProvider } from "../payments";
import type { VerifyResult } from "../payments/PaymentProvider";
import { notifyPaymentConfirmed } from "./notifications";

/** Per-order callback base, e.g. {API}/api/payments/bkash/NM-000007 */
export function callbackBaseUrl(method: PaymentMethod, orderNumber: string): string {
  return `${env.apiUrl}/api/payments/${method.toLowerCase()}/${encodeURIComponent(orderNumber)}`;
}

/**
 * Opaque, unforgeable token tying payment initiation to whoever placed the
 * order — returned from order creation and required by the public /initiate
 * endpoint. Stops order-number enumeration / IDOR without a DB column.
 */
export function paymentToken(orderNumber: string): string {
  return crypto.createHmac("sha256", env.jwtSecret).update(`pay:${orderNumber}`).digest("hex").slice(0, 32);
}

export function verifyPaymentToken(orderNumber: string, token: string): boolean {
  const expected = paymentToken(orderNumber);
  const a = Buffer.from(expected);
  const b = Buffer.from(token || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Create a gateway session for an order and return the redirect URL. */
export async function initiatePayment(orderNumber: string): Promise<{ redirectUrl: string }> {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw notFound("Order not found");
  if (order.paymentMethod === "COD") throw badRequest("COD orders do not require online payment");
  if (order.paymentStatus === "PAID") throw badRequest("This order is already paid");

  const provider = getProvider(order.paymentMethod);
  if (!provider) throw badRequest("Unsupported payment method");
  if (!provider.configured) {
    throw new AppError(503, `${order.paymentMethod} is not configured yet. Please choose Cash on Delivery or contact support.`);
  }

  const result = await provider.initiate({
    orderNumber: order.orderNumber,
    amount: Number(order.total),
    customer: { name: order.shippingName, email: order.shippingEmail, phone: order.shippingPhone },
    callbackBaseUrl: callbackBaseUrl(order.paymentMethod, order.orderNumber),
  });

  // Record the attempt for audit + reconciliation (stores the gateway ref).
  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: order.paymentMethod,
      amount: order.total,
      status: "INITIATED",
      gatewayTransactionId: result.gatewayReference ?? null,
      payload: (result.raw ?? {}) as Prisma.InputJsonValue,
    },
  });

  return { redirectUrl: result.redirectUrl };
}

export type SettleResult = { outcome: VerifyResult["outcome"]; orderNumber: string };

const AMOUNT_TOLERANCE = 0.5;

/** Guarded write: a terminal PAID/REFUNDED order can never be overwritten. */
async function guardedStatusWrite(orderId: string, paymentStatus: "FAILED", historyStatus: string, note: string) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { notIn: ["PAID", "REFUNDED"] } },
    data: { paymentStatus },
  });
  if (updated.count > 0) {
    await prisma.orderStatusHistory.create({ data: { orderId, status: historyStatus, note } });
  }
}

/**
 * Verify a gateway result server-side and settle the order. Idempotent and
 * safe under concurrent callback + IPN delivery.
 */
export async function verifyAndSettle(
  method: PaymentMethod,
  orderNumber: string,
  params: Record<string, unknown>
): Promise<SettleResult> {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw notFound("Order not found");

  // The callback provider must match how the order is being paid.
  if (order.paymentMethod !== method) {
    return { outcome: "FAILED", orderNumber };
  }

  // Already settled — short-circuit (idempotent for duplicate callback + IPN).
  if (order.paymentStatus === "PAID") return { outcome: "PAID", orderNumber };

  const provider = getProvider(method);
  if (!provider) throw badRequest("Unsupported payment method");

  // Server-to-server verification, bound to THIS order inside the provider.
  const verified = await provider.verify(orderNumber, params);

  // Persist every verification attempt for audit.
  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: method,
      amount: order.total,
      status: verified.outcome === "PAID" ? "SUCCESS" : verified.outcome === "CANCELLED" ? "CANCELLED" : verified.outcome === "PENDING" ? "INITIATED" : "FAILED",
      gatewayTransactionId: verified.gatewayTransactionId ?? null,
      payload: (verified.raw ?? {}) as Prisma.InputJsonValue,
    },
  });

  // Indeterminate — the customer may actually have paid. Leave the order alone
  // so a later callback / IPN / reconciliation can settle it.
  if (verified.outcome === "PENDING" || verified.outcome === "CANCELLED") {
    return { outcome: verified.outcome, orderNumber };
  }

  if (verified.outcome === "FAILED") {
    await guardedStatusWrite(order.id, "FAILED", "PAYMENT_FAILED", `${method} payment failed`);
    return { outcome: "FAILED", orderNumber };
  }

  // PAID — fail closed: require a confirmed amount that matches the order total.
  if (verified.amount === undefined || !Number.isFinite(verified.amount)) {
    await guardedStatusWrite(order.id, "FAILED", "PAYMENT_UNVERIFIED_AMOUNT", `${method} reported success without a verifiable amount`);
    return { outcome: "FAILED", orderNumber };
  }
  if (Math.abs(verified.amount - Number(order.total)) > AMOUNT_TOLERANCE) {
    await guardedStatusWrite(order.id, "FAILED", "PAYMENT_MISMATCH", `Amount mismatch: gateway ${verified.amount} vs order ${order.total}`);
    return { outcome: "FAILED", orderNumber };
  }

  // Atomic, idempotent transition (anything-not-PAID) → PAID.
  const updated = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });
  if (updated.count > 0) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "PAYMENT_PAID",
        note: `Paid via ${method}${verified.gatewayTransactionId ? ` (txn ${verified.gatewayTransactionId})` : ""}`,
      },
    });
    void notifyPaymentConfirmed(order.id); // fire-and-forget SMS, fires once
  }

  return { outcome: "PAID", orderNumber };
}

/**
 * Reconciliation sweep (spec §5): bKash and Nagad settle via the customer's
 * browser redirect; if that never lands (tab closed, network drop) a charged
 * order would stay PENDING. This re-checks recently-initiated, still-unpaid
 * online orders against the gateway using the stored reference, and settles
 * any that actually completed. SSLCommerz has a server-side IPN so it self-heals.
 */
export async function reconcilePendingPayments(): Promise<{ checked: number; settled: number }> {
  const now = Date.now();
  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: { in: ["BKASH", "NAGAD"] },
      paymentStatus: { in: ["PENDING", "FAILED"] },
      status: { not: "CANCELLED" },
      // initiated long enough ago to have completed, but still recent
      createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000), lte: new Date(now - 90 * 1000) },
    },
    include: { transactions: { where: { status: "INITIATED" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let settled = 0;
  for (const order of orders) {
    const ref = order.transactions[0]?.gatewayTransactionId;
    if (!ref) continue;
    const provider = getProvider(order.paymentMethod);
    if (!provider?.configured) continue;
    // Synthesize the callback params the gateway would have sent.
    const params =
      order.paymentMethod === "BKASH"
        ? { paymentID: ref, status: "success" }
        : { payment_ref_id: ref, status: "success" };
    try {
      const res = await verifyAndSettle(order.paymentMethod, order.orderNumber, params);
      if (res.outcome === "PAID") settled++;
    } catch (err) {
      console.error(`Reconcile failed for ${order.orderNumber}:`, err);
    }
  }
  return { checked: orders.length, settled };
}

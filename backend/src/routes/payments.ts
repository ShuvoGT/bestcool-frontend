/**
 * Payment routes (spec §5).
 *  - GET  /payments/methods                      list online methods + configured flag
 *  - POST /payments/initiate                     start a gateway session → redirect URL
 *  - ANY  /payments/:provider/:orderNumber/...   gateway callbacks & IPN
 *
 * Callbacks land here from the gateway, are verified SERVER-SIDE, then the
 * customer is redirected to a storefront result page. IPN endpoints return
 * plain 200/400 to the gateway. All settlement goes through verifyAndSettle.
 */
import { Router } from "express";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { asyncHandler, badRequest } from "../lib/errors";
import { validate } from "../middleware/validate";
import { callbackLimiter, checkoutLimiter } from "../middleware/rateLimit";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { listOnlineMethods } from "../payments";
import { loadPaymentConfig } from "../payments/config";
import { initiatePayment, verifyAndSettle, verifyPaymentToken } from "../services/payments";

export const paymentsRouter = Router();

const PROVIDER_BY_SLUG: Record<string, PaymentMethod> = {
  bkash: "BKASH",
  nagad: "NAGAD",
  sslcommerz: "SSLCOMMERZ",
};

const LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  SSLCOMMERZ: "Card / Net Banking (SSLCommerz)",
};

// Payment methods the storefront may offer. COD is always available; an online
// gateway appears ONLY when it's configured in admin Settings (or .env) — so
// unconfigured gateways are hidden from checkout entirely.
paymentsRouter.get(
  "/methods",
  asyncHandler(async (_req, res) => {
    const cfg = await loadPaymentConfig();
    const online = listOnlineMethods(cfg)
      .filter((m) => m.configured)
      .map((m) => ({ method: m.method, label: LABELS[m.method] }));
    res.json({ methods: [{ method: "COD", label: LABELS.COD }, ...online] });
  })
);

// Start a gateway session for an existing order. Authorised either by the
// order's owner (logged-in) or by the unforgeable payment token handed back at
// order creation — this prevents order-number enumeration / IDOR.
paymentsRouter.post(
  "/initiate",
  checkoutLimiter,
  validate({ body: z.object({ orderNumber: z.string().min(1), paymentToken: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const { orderNumber, paymentToken } = req.body as { orderNumber: string; paymentToken?: string };
    const owned =
      req.user &&
      (await prisma.order.findFirst({ where: { orderNumber, userId: req.user.id }, select: { id: true } }));
    if (!owned && !(paymentToken && verifyPaymentToken(orderNumber, paymentToken))) {
      return res.status(403).json({ error: "Not authorised to pay for this order" });
    }
    const result = await initiatePayment(orderNumber);
    res.json(result);
  })
);

// --- Gateway callbacks & IPN ------------------------------------------------
// Mounted per provider slug + order number; gateways send GET or POST.
const storefrontResult = (outcome: string, orderNumber: string) => {
  const o = encodeURIComponent(orderNumber);
  if (outcome === "PAID") return `${env.frontendUrl}/order-success?order=${o}&paid=1`;
  if (outcome === "CANCELLED") return `${env.frontendUrl}/payment-failed?order=${o}&reason=cancelled`;
  // PENDING (e.g. customer returned before the gateway settled) still lands on
  // a non-error page — the reconcile sweep / IPN will finalise it.
  if (outcome === "PENDING") return `${env.frontendUrl}/order-success?order=${o}&pending=1`;
  return `${env.frontendUrl}/payment-failed?order=${o}&reason=failed`;
};

function resolveProvider(slug: string): PaymentMethod {
  const method = PROVIDER_BY_SLUG[slug.toLowerCase()];
  if (!method) throw badRequest("Unknown payment provider");
  return method;
}

// Customer-facing redirect endpoints (success/fail/cancel/callback).
// bKash uses /callback; SSLCommerz uses /success|/fail|/cancel; Nagad /callback.
async function handleRedirect(slug: string, orderNumber: string, params: Record<string, unknown>, res: import("express").Response) {
  const method = resolveProvider(slug);
  let outcome = "FAILED";
  try {
    const settled = await verifyAndSettle(method, orderNumber, params);
    outcome = settled.outcome;
  } catch (err) {
    console.error(`Payment callback verify failed for ${method} ${orderNumber}:`, err);
  }
  res.redirect(storefrontResult(outcome, orderNumber));
}

for (const path of ["/:provider/:orderNumber/callback", "/:provider/:orderNumber/success", "/:provider/:orderNumber/fail", "/:provider/:orderNumber/cancel"]) {
  paymentsRouter.get(path, callbackLimiter, asyncHandler((req, res) => handleRedirect(req.params.provider, req.params.orderNumber, { ...req.query }, res)));
  paymentsRouter.post(path, callbackLimiter, asyncHandler((req, res) => handleRedirect(req.params.provider, req.params.orderNumber, { ...req.query, ...req.body }, res)));
}

// Server-to-server IPN/webhook — verified the same way; returns plain status.
paymentsRouter.post(
  "/:provider/:orderNumber/ipn",
  callbackLimiter,
  asyncHandler(async (req, res) => {
    const method = resolveProvider(req.params.provider);
    try {
      const settled = await verifyAndSettle(method, req.params.orderNumber, { ...req.query, ...req.body });
      res.status(200).json({ ok: true, outcome: settled.outcome });
    } catch (err) {
      console.error(`IPN verify failed for ${method} ${req.params.orderNumber}:`, err);
      res.status(400).json({ ok: false });
    }
  })
);

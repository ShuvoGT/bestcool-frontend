/**
 * Public courier webhook endpoints (spec §11).
 * POST /api/couriers/:provider/webhook — push status updates from couriers.
 *
 * Verified server-side via a shared secret (COURIER_WEBHOOK_SECRET): the
 * courier must present it as ?secret=… or an X-Webhook-Secret header (you
 * configure this value in each courier's webhook settings). Updates are then
 * matched to an order by consignment id, so a body alone can't move an
 * unrelated order.
 */
import { Router } from "express";
import crypto from "crypto";
import type { CourierName } from "@prisma/client";
import { asyncHandler, badRequest } from "../lib/errors";
import { callbackLimiter } from "../middleware/rateLimit";
import { env } from "../config/env";
import { applyCourierWebhook } from "../services/couriers";

export const couriersRouter = Router();

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

couriersRouter.post(
  "/:provider/webhook",
  callbackLimiter,
  asyncHandler(async (req, res) => {
    const courier = PROVIDER_BY_SLUG[(req.params.provider || "").toLowerCase()];
    if (!courier) throw badRequest("Unknown courier");

    // Verify the shared secret before trusting anything in the body.
    const provided = (req.query.secret as string) || (req.header("x-webhook-secret") ?? "");
    if (!env.courierWebhookSecret || !timingSafeEqual(provided, env.courierWebhookSecret)) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }

    const body = { ...(req.query as Record<string, unknown>), ...(req.body as Record<string, unknown>) };
    const result = await applyCourierWebhook(courier, body);
    res.status(200).json(result);
  })
);

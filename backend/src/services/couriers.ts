/**
 * Courier orchestration (spec §11): create a consignment for an order, refresh
 * its status, and apply verified webhook updates.
 *
 * Rules:
 *  - On successful consignment, the order's courier fields are saved and the
 *    delivery status moves to SHIPPED (which fires the customer email/SMS with
 *    the tracking id, via updateOrderStatus + notifyStatusChange).
 *  - Status refresh / webhook pull the courier's latest status; a "delivered"
 *    result advances the order to DELIVERED (with notification), a
 *    "cancelled/returned" result is recorded on the order's courier status.
 */
import { type CourierName } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError, badRequest, notFound } from "../lib/errors";
import { getCourier } from "../couriers";
import { loadCourierConfig } from "../couriers/config";
import type { CreateParcelInput } from "../couriers/CourierProvider";
import { updateOrderStatus } from "./orders";
import { notifyStatusChange } from "./notifications";

export type SendToCourierInput = {
  courier: CourierName;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZone?: string;
  codAmount: number;
  weightKg?: number;
  note?: string;
};

export async function sendToCourier(orderId: string, input: SendToCourierInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.consignmentId) throw badRequest("This order has already been sent to a courier");
  if (order.status === "CANCELLED") throw badRequest("Cannot ship a cancelled order");

  const provider = getCourier(input.courier);
  const cfg = await loadCourierConfig();
  if (!provider.isConfigured(cfg)) {
    throw new AppError(503, `${input.courier} is not configured. Add its credentials in Settings → Couriers.`);
  }

  const parcel: CreateParcelInput = {
    orderNumber: order.orderNumber,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    recipientAddress: input.recipientAddress,
    recipientCity: input.recipientCity,
    recipientZone: input.recipientZone,
    codAmount: input.codAmount,
    weightKg: input.weightKg,
    note: input.note,
  };
  // Surface courier/network errors as a clean 502 (not a generic 500).
  let result;
  try {
    result = await provider.createParcel(parcel, cfg);
  } catch (err) {
    throw new AppError(502, err instanceof Error ? err.message : `${input.courier} request failed`);
  }

  // Save courier fields. updateOrderStatus(SHIPPED) writes history + the
  // SHIPPED email/SMS reads these fields, so persist them first.
  await prisma.order.update({
    where: { id: order.id },
    data: {
      courierName: input.courier,
      consignmentId: result.consignmentId,
      courierStatus: result.status ?? "Consignment created",
      courierTrackingUrl: result.trackingUrl ?? null,
    },
  });

  // Auto-advance to SHIPPED. The status flow requires CONFIRMED before SHIPPED,
  // so confirm a still-PENDING order first (silently), then ship + notify.
  let status: string = order.status;
  if (status === "PENDING") {
    await updateOrderStatus(order.id, "CONFIRMED", "Auto-confirmed for courier dispatch");
    status = "CONFIRMED";
  }
  if (status === "CONFIRMED") {
    await updateOrderStatus(order.id, "SHIPPED", `Sent via ${input.courier} (${result.consignmentId})`);
    void notifyStatusChange(order.id, "SHIPPED"); // includes courier + tracking id
  }

  return { consignmentId: result.consignmentId, trackingUrl: result.trackingUrl ?? null, status: result.status ?? null };
}

/** Pull the latest parcel status from the courier and store it on the order. */
export async function refreshCourierStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (!order.courierName || !order.consignmentId) throw badRequest("This order has not been sent to a courier yet");

  const provider = getCourier(order.courierName);
  const cfg = await loadCourierConfig();
  let result;
  try {
    result = await provider.getStatus(order.consignmentId, cfg);
  } catch (err) {
    throw new AppError(502, err instanceof Error ? err.message : "Courier status request failed");
  }

  await applyCourierStatus(order.id, order.status, result.status, result.delivered, result.cancelled);
  return { status: result.status, delivered: result.delivered, cancelled: result.cancelled ?? false };
}

/**
 * Apply a courier status to an order: always record the raw label; advance to
 * DELIVERED when the courier confirms delivery. Never downgrades a terminal
 * order state.
 */
async function applyCourierStatus(
  orderId: string,
  currentStatus: string,
  courierStatus: string,
  delivered: boolean,
  cancelled?: boolean
) {
  await prisma.order.update({ where: { id: orderId }, data: { courierStatus } });

  // Only notify when the order ACTUALLY transitioned — updateOrderStatus
  // returns the (unchanged) order on a no-op and throws on an illegal move, so
  // a racing/duplicate webhook can't trigger a false "delivered/cancelled" SMS.
  if (delivered && currentStatus === "SHIPPED") {
    const updated = await updateOrderStatus(orderId, "DELIVERED", `Courier confirmed delivery (${courierStatus})`).catch(() => null);
    if (updated?.status === "DELIVERED") void notifyStatusChange(orderId, "DELIVERED");
  } else if (cancelled && (currentStatus === "SHIPPED" || currentStatus === "CONFIRMED" || currentStatus === "PENDING")) {
    // Parcel returned/cancelled by courier — restore stock + mark cancelled.
    const updated = await updateOrderStatus(orderId, "CANCELLED", `Courier reported ${courierStatus}`).catch(() => null);
    if (updated?.status === "CANCELLED") void notifyStatusChange(orderId, "CANCELLED");
  }
}

/** Apply a verified webhook update (signature/secret checked by the route). */
export async function applyCourierWebhook(courier: CourierName, body: Record<string, unknown>) {
  const provider = getCourier(courier);
  const parsed = provider.parseWebhook?.(body);
  if (!parsed) return { applied: false };

  const order = await prisma.order.findFirst({ where: { courierName: courier, consignmentId: parsed.consignmentId } });
  if (!order) return { applied: false };

  await applyCourierStatus(order.id, order.status, parsed.status, parsed.delivered, parsed.cancelled);
  return { applied: true };
}

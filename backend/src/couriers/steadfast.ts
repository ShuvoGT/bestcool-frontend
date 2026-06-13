/**
 * Steadfast Courier API (spec §11).
 * Docs: https://portal.packzy.com — "API Documentation".
 * Steadfast has a single base URL (no separate sandbox host); use a test API
 * key for testing. Auth via Api-Key + Secret-Key headers.
 */
import type {
  CourierConfig,
  CourierProvider,
  CourierStatusResult,
  CreateParcelInput,
  CreateParcelResult,
} from "./CourierProvider";
import { courierJson } from "./http";

const BASE = "https://portal.packzy.com/api/v1";

// Steadfast delivery_status values → normalised flags.
const DELIVERED = new Set(["delivered", "partial_delivered"]);
const CANCELLED = new Set(["cancelled", "returned"]);

export class SteadfastProvider implements CourierProvider {
  readonly name = "STEADFAST" as const;

  isConfigured(cfg: CourierConfig): boolean {
    const c = cfg.steadfast;
    return c.enabled && Boolean(c.apiKey && c.secretKey);
  }

  private headers(cfg: CourierConfig) {
    return {
      "Content-Type": "application/json",
      "Api-Key": cfg.steadfast.apiKey,
      "Secret-Key": cfg.steadfast.secretKey,
    };
  }

  async createParcel(input: CreateParcelInput, cfg: CourierConfig): Promise<CreateParcelResult> {
    const res = await fetch(`${BASE}/create_order`, {
      method: "POST",
      headers: this.headers(cfg),
      body: JSON.stringify({
        invoice: input.orderNumber,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: `${input.recipientAddress}, ${input.recipientCity}`,
        cod_amount: input.codAmount,
        note: input.note ?? "",
      }),
    });
    const data = await courierJson<{
      status?: number;
      message?: string;
      consignment?: { consignment_id?: number | string; tracking_code?: string; status?: string };
    }>("Steadfast", res);
    const c = data.consignment;
    if (!c?.tracking_code && !c?.consignment_id) {
      throw new Error(`Steadfast create failed: ${data.message || "no consignment returned"}`);
    }
    const tracking = c.tracking_code || String(c.consignment_id);
    return {
      consignmentId: tracking,
      trackingUrl: `https://steadfast.com.bd/t/${tracking}`,
      status: c.status,
      raw: data,
    };
  }

  async getStatus(consignmentId: string, cfg: CourierConfig): Promise<CourierStatusResult> {
    const res = await fetch(`${BASE}/status_by_trackingcode/${encodeURIComponent(consignmentId)}`, {
      headers: this.headers(cfg),
    });
    const data = await courierJson<{ delivery_status?: string }>("Steadfast", res);
    const status = data.delivery_status ?? "unknown";
    return { status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status), raw: data };
  }

  parseWebhook(body: Record<string, unknown>) {
    // Steadfast delivery webhook: { consignment_id, tracking_code, status, ... }
    const consignmentId = String(body.tracking_code ?? body.consignment_id ?? "");
    const status = String(body.status ?? body.delivery_status ?? "");
    if (!consignmentId || !status) return null;
    return { consignmentId, status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status) };
  }
}

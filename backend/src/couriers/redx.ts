/**
 * RedX API (spec §11).
 * Docs: https://redx.com.bd — Open API. Auth via API-ACCESS-TOKEN header.
 *
 * Note: RedX parcels need a delivery_area_id. The admin "Send to Courier" form
 * collects an area id; use RedX's /areas lookup to populate it in production.
 */
import type {
  CourierConfig,
  CourierProvider,
  CourierStatusResult,
  CreateParcelInput,
  CreateParcelResult,
} from "./CourierProvider";
import { courierJson } from "./http";

const baseFor = (cfg: CourierConfig) =>
  cfg.mode === "live" ? "https://openapi.redx.com.bd/v1.0.0-beta" : "https://sandbox.redx.com.bd/v1.0.0-beta";

const DELIVERED = new Set(["delivered", "delivery-completed"]);
const CANCELLED = new Set(["cancelled", "returned", "return-completed"]);

export class RedxProvider implements CourierProvider {
  readonly name = "REDX" as const;

  isConfigured(cfg: CourierConfig): boolean {
    return cfg.redx.enabled && Boolean(cfg.redx.apiToken);
  }

  private headers(cfg: CourierConfig) {
    return {
      "Content-Type": "application/json",
      "API-ACCESS-TOKEN": `Bearer ${cfg.redx.apiToken}`,
    };
  }

  async createParcel(input: CreateParcelInput, cfg: CourierConfig): Promise<CreateParcelResult> {
    const res = await fetch(`${baseFor(cfg)}/parcel`, {
      method: "POST",
      headers: this.headers(cfg),
      body: JSON.stringify({
        customer_name: input.recipientName,
        customer_phone: input.recipientPhone,
        delivery_area: input.recipientCity,
        delivery_area_id: Number(input.recipientZone) || undefined,
        customer_address: input.recipientAddress,
        merchant_invoice_id: input.orderNumber,
        cash_collection_amount: String(input.codAmount),
        parcel_weight: (input.weightKg ?? 0.5) * 1000, // grams
        value: input.codAmount || 1000,
        parcel_details_json: [{ name: input.itemDescription ?? `Order ${input.orderNumber}`, quantity: 1 }],
      }),
    });
    const data = await courierJson<{ tracking_id?: string; message?: string }>("RedX", res);
    if (!data.tracking_id) throw new Error(`RedX create failed: ${data.message || "no tracking id"}`);
    return {
      consignmentId: data.tracking_id,
      trackingUrl: `https://redx.com.bd/track-parcel/?trackingId=${encodeURIComponent(data.tracking_id)}`,
      raw: data,
    };
  }

  async getStatus(consignmentId: string, cfg: CourierConfig): Promise<CourierStatusResult> {
    const res = await fetch(`${baseFor(cfg)}/parcel/track/${encodeURIComponent(consignmentId)}`, {
      headers: this.headers(cfg),
    });
    const data = await courierJson<{ tracking?: { message_en?: string; status?: string }[] }>("RedX", res);
    const latest = data.tracking?.[0];
    const status = latest?.status ?? latest?.message_en ?? "unknown";
    return { status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status), raw: data };
  }

  parseWebhook(body: Record<string, unknown>) {
    const consignmentId = String(body.tracking_id ?? "");
    const status = String(body.status ?? "");
    if (!consignmentId || !status) return null;
    return { consignmentId, status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status) };
  }
}

/**
 * Pathao Courier Merchant API (spec §11).
 * Docs: https://merchant.pathao.com → Developer API.
 * OAuth password grant → access token (cached), then create order / query.
 *
 * Note: Pathao addresses require numeric city/zone/area ids. The admin
 * "Send to Courier" form collects a city/zone id (defaults to Dhaka). Use
 * Pathao's city/zone/area lookup endpoints to populate these in production.
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
  cfg.mode === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";

// Pathao order_status strings → normalised flags.
const DELIVERED = new Set(["Delivered", "Partial_Delivery"]);
const CANCELLED = new Set(["Cancelled", "Return", "Returned"]);
const DEFAULT_DHAKA_CITY = 1;

type TokenCache = { token: string; expiresAt: number };

export class PathaoProvider implements CourierProvider {
  readonly name = "PATHAO" as const;
  private tokens = new Map<string, TokenCache>();

  isConfigured(cfg: CourierConfig): boolean {
    const c = cfg.pathao;
    return c.enabled && Boolean(c.clientId && c.clientSecret && c.username && c.password && c.storeId);
  }

  private async token(cfg: CourierConfig): Promise<string> {
    const c = cfg.pathao;
    const cached = this.tokens.get(c.clientId);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const res = await fetch(`${baseFor(cfg)}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        grant_type: "password",
        username: c.username,
        password: c.password,
      }),
    });
    const data = await courierJson<{ access_token?: string; expires_in?: number; message?: string }>("Pathao", res);
    if (!data.access_token) throw new Error(`Pathao auth failed: ${data.message || "no token"}`);
    this.tokens.set(c.clientId, { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 });
    return data.access_token;
  }

  private async authHeaders(cfg: CourierConfig) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${await this.token(cfg)}`,
    };
  }

  async createParcel(input: CreateParcelInput, cfg: CourierConfig): Promise<CreateParcelResult> {
    const res = await fetch(`${baseFor(cfg)}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: await this.authHeaders(cfg),
      body: JSON.stringify({
        store_id: Number(cfg.pathao.storeId),
        merchant_order_id: input.orderNumber,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: `${input.recipientAddress}, ${input.recipientCity}`,
        recipient_city: Number(input.recipientZone) || DEFAULT_DHAKA_CITY,
        recipient_zone: Number(input.recipientZone) || undefined,
        delivery_type: 48, // normal delivery
        item_type: 2, // parcel
        item_quantity: 1,
        item_weight: input.weightKg ?? 0.5,
        amount_to_collect: input.codAmount,
        item_description: input.itemDescription ?? `Order ${input.orderNumber}`,
        special_instruction: input.note ?? "",
      }),
    });
    const data = await courierJson<{
      message?: string;
      data?: { consignment_id?: string; order_status?: string; merchant_order_id?: string };
    }>("Pathao", res);
    const consignmentId = data.data?.consignment_id;
    if (!consignmentId) throw new Error(`Pathao create failed: ${data.message || "no consignment id"}`);
    return {
      consignmentId,
      trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(consignmentId)}`,
      status: data.data?.order_status,
      raw: data,
    };
  }

  async getStatus(consignmentId: string, cfg: CourierConfig): Promise<CourierStatusResult> {
    const res = await fetch(`${baseFor(cfg)}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`, {
      headers: await this.authHeaders(cfg),
    });
    const data = await courierJson<{ data?: { order_status?: string } }>("Pathao", res);
    const status = data.data?.order_status ?? "unknown";
    return { status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status), raw: data };
  }

  parseWebhook(body: Record<string, unknown>) {
    // Pathao webhook: { consignment_id, order_status / event, ... }
    const consignmentId = String(body.consignment_id ?? "");
    const status = String(body.order_status ?? body.event ?? "");
    if (!consignmentId || !status) return null;
    return { consignmentId, status, delivered: DELIVERED.has(status), cancelled: CANCELLED.has(status) };
  }
}

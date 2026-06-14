/**
 * Courier abstraction (ported from backend/src/couriers/CourierProvider.ts) —
 * mirrors the PaymentProvider pattern. Each courier implements this interface;
 * the admin order flow only ever talks to it.
 */
import type { CourierName } from "@prisma/client";

export type CourierMode = "sandbox" | "live";

export type CourierConfig = {
  mode: CourierMode;
  steadfast: { enabled: boolean; apiKey: string; secretKey: string };
  pathao: { enabled: boolean; clientId: string; clientSecret: string; username: string; password: string; storeId: string };
  redx: { enabled: boolean; apiToken: string };
};

/** What we send a courier to create a parcel/consignment. */
export type CreateParcelInput = {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string; // district / city
  recipientZone?: string;
  codAmount: number; // amount the courier should collect (0 = prepaid)
  weightKg?: number;
  itemDescription?: string;
  note?: string;
};

export type CreateParcelResult = {
  /** Courier's consignment / tracking id, saved on the order. */
  consignmentId: string;
  trackingUrl?: string;
  status?: string;
  raw?: unknown;
};

export type CourierStatusResult = {
  /** Raw courier status label, stored on the order. */
  status: string;
  /** Normalised: true once the parcel is delivered. */
  delivered: boolean;
  /** Normalised: true once the parcel is cancelled/returned. */
  cancelled?: boolean;
  raw?: unknown;
};

export interface CourierProvider {
  readonly name: CourierName;

  /** True only when this courier is enabled and all its credentials are set. */
  isConfigured(cfg: CourierConfig): boolean;

  /** Create a consignment and return its tracking id. */
  createParcel(input: CreateParcelInput, cfg: CourierConfig): Promise<CreateParcelResult>;

  /** Pull the latest parcel status from the courier API. */
  getStatus(consignmentId: string, cfg: CourierConfig): Promise<CourierStatusResult>;

  /**
   * Parse a verified webhook body into a status update, or null if it isn't a
   * recognised/relevant event. (Signature/secret verification happens before
   * this is called.)
   */
  parseWebhook?(body: Record<string, unknown>): { consignmentId: string; status: string; delivered: boolean; cancelled?: boolean } | null;
}

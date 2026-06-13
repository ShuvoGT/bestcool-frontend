/**
 * Payment abstraction (spec §5). Every online gateway implements this
 * interface; routes and the order flow only ever talk to it, so a gateway
 * can be added/swapped without touching business logic.
 *
 * Security contract (enforced by callers):
 *  - initiate() only creates a gateway session and returns a redirect URL.
 *  - An order is NEVER marked PAID from a client redirect alone — the success
 *    callback and IPN both call verify(), which performs a server-to-server
 *    check (execute/validate/query) against the gateway before we trust it.
 */
import type { PaymentMethod } from "@prisma/client";

export type PaymentMode = "sandbox" | "live";

/**
 * Resolved payment configuration. Credentials are managed from the admin
 * Settings panel (DB) with .env as a fallback default — see payments/config.ts.
 * A gateway is only offered at checkout when its slice is `enabled` AND all
 * required credentials are present.
 */
export type PaymentConfig = {
  mode: PaymentMode;
  bkash: { enabled: boolean; appKey: string; appSecret: string; username: string; password: string };
  nagad: { enabled: boolean; merchantId: string; merchantPrivateKey: string; pgPublicKey: string };
  sslcommerz: { enabled: boolean; storeId: string; storePassword: string };
};

export type InitiateContext = {
  /** Our order number, used as the gateway's merchant transaction id. */
  orderNumber: string;
  amount: number;
  customer: { name: string; email: string; phone: string };
  /** Where the gateway sends the customer back (our backend callback). */
  callbackBaseUrl: string;
};

export type InitiateResult = {
  /** URL to redirect the customer to, to complete payment. */
  redirectUrl: string;
  /** Gateway's payment/session id, stored for later verification. */
  gatewayReference?: string;
  /** Raw gateway response, persisted on the transaction for audit. */
  raw?: unknown;
};

// PENDING = the gateway could not give us a definitive answer yet (network
// blip, in-progress, indeterminate). It must NOT terminally fail an order the
// customer may actually have paid — a later callback/IPN/reconcile retries.
export type PaymentOutcome = "PAID" | "FAILED" | "CANCELLED" | "PENDING";

export type VerifyResult = {
  outcome: PaymentOutcome;
  /** The settled transaction id from the gateway (trxID / val_id / ref). */
  gatewayTransactionId?: string;
  /** Amount the gateway reports as paid — callers MUST check it matches. */
  amount?: number;
  raw?: unknown;
};

export interface PaymentProvider {
  readonly method: PaymentMethod;

  /** True only when this gateway is enabled and all its credentials are set. */
  isConfigured(cfg: PaymentConfig): boolean;

  /** Create a gateway session and return where to send the customer. */
  initiate(ctx: InitiateContext, cfg: PaymentConfig): Promise<InitiateResult>;

  /**
   * Server-side verification. `orderNumber` is the order being settled; the
   * provider MUST confirm the gateway's echoed merchant order id matches it
   * (anti cross-order-replay) before reporting PAID. `params` carries whatever
   * the gateway sent to our callback/IPN (query or body).
   */
  verify(orderNumber: string, params: Record<string, unknown>, cfg: PaymentConfig): Promise<VerifyResult>;
}

/**
 * bKash Tokenized Checkout / PGW (spec §5).
 * Flow:
 *   1. grantToken()  — auth, cached until near expiry
 *   2. createPayment() in initiate() — returns bkashURL to redirect to
 *   3. customer pays; bKash redirects to our callback with ?paymentID&status
 *   4. verify() → executePayment() (settles the txn) then trusts only a
 *      "Completed" transactionStatus. queryPayment() is the fallback check.
 *
 * Docs: https://developer.bka.sh — Tokenized Checkout v1.2.0-beta
 */
import { env } from "../config/env";
import type {
  InitiateContext,
  InitiateResult,
  PaymentProvider,
  VerifyResult,
} from "./PaymentProvider";

const BASE =
  env.paymentMode === "live"
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout";

type TokenCache = { idToken: string; expiresAt: number };

export class BkashProvider implements PaymentProvider {
  readonly method = "BKASH" as const;
  private token: TokenCache | null = null;

  get configured(): boolean {
    const c = env.payment.bkash;
    return Boolean(c.appKey && c.appSecret && c.username && c.password);
  }

  /** Grant (and cache) an id_token. bKash tokens last ~1h; refresh early. */
  private async grantToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.idToken;
    const c = env.payment.bkash;
    const res = await fetch(`${BASE}/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: c.username,
        password: c.password,
      },
      body: JSON.stringify({ app_key: c.appKey, app_secret: c.appSecret }),
    });
    const data = (await res.json()) as { id_token?: string; expires_in?: number; statusMessage?: string };
    if (!data.id_token) throw new Error(`bKash grant token failed: ${data.statusMessage || "no token"}`);
    this.token = { idToken: data.id_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return data.id_token;
  }

  private async authHeaders() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: await this.grantToken(),
      "x-app-key": env.payment.bkash.appKey,
    };
  }

  async initiate(ctx: InitiateContext): Promise<InitiateResult> {
    const res = await fetch(`${BASE}/create`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({
        mode: "0011", // tokenized checkout (URL based)
        payerReference: ctx.customer.phone || ctx.orderNumber,
        callbackURL: `${ctx.callbackBaseUrl}/callback`,
        amount: ctx.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: ctx.orderNumber,
      }),
    });
    const data = (await res.json()) as { paymentID?: string; bkashURL?: string; statusMessage?: string };
    if (!data.paymentID || !data.bkashURL) {
      throw new Error(`bKash create payment failed: ${data.statusMessage || "no payment URL"}`);
    }
    return { redirectUrl: data.bkashURL, gatewayReference: data.paymentID, raw: data };
  }

  async verify(orderNumber: string, params: Record<string, unknown>): Promise<VerifyResult> {
    const paymentID = (params.paymentID as string) || "";
    const status = ((params.status as string) || "").toLowerCase();

    if (!paymentID) return { outcome: "FAILED", raw: params };
    if (status === "cancel") return { outcome: "CANCELLED", raw: params };
    if (status === "failure") return { outcome: "FAILED", raw: params };

    // Settle the transaction server-side with execute; fall back to query when
    // execute was already run (duplicate callback + IPN, or reconciliation).
    let exec = await this.execute(paymentID);
    if (exec.transactionStatus !== "Completed") {
      exec = await this.query(paymentID);
    }

    if (exec.transactionStatus === "Completed") {
      // Anti cross-order-replay: require bKash's echoed invoice to equal THIS
      // order. Fail closed if it's absent — a genuine completed payment always
      // carries merchantInvoiceNumber, so this never declines a real payment.
      if (exec.merchantInvoiceNumber !== orderNumber) {
        return { outcome: "FAILED", gatewayTransactionId: exec.trxID, raw: { reason: "invoice mismatch/absent", expected: orderNumber, got: exec.merchantInvoiceNumber ?? null, exec } };
      }
      return { outcome: "PAID", gatewayTransactionId: exec.trxID, amount: exec.amount ? Number(exec.amount) : undefined, raw: exec };
    }
    // A definitive bKash status that isn't "Completed" is a real failure;
    // no status at all means we couldn't determine it → PENDING (retry later).
    return { outcome: exec.transactionStatus ? "FAILED" : "PENDING", gatewayTransactionId: exec.trxID, raw: exec };
  }

  private async execute(paymentID: string) {
    const res = await fetch(`${BASE}/execute`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({ paymentID }),
    });
    return (await res.json()) as { transactionStatus?: string; trxID?: string; amount?: string; merchantInvoiceNumber?: string; statusMessage?: string };
  }

  private async query(paymentID: string) {
    const res = await fetch(`${BASE}/payment/status`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({ paymentID }),
    });
    return (await res.json()) as { transactionStatus?: string; trxID?: string; amount?: string; merchantInvoiceNumber?: string };
  }
}

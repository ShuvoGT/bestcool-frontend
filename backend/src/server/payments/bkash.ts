/**
 * bKash Tokenized Checkout / PGW (ported verbatim from backend/src/payments/bkash.ts).
 * grantToken (cached) → createPayment (initiate) → customer pays → verify()
 * executes/queries server-side and trusts only "Completed".
 */
import type {
  InitiateContext,
  InitiateResult,
  PaymentConfig,
  PaymentProvider,
  VerifyResult,
} from "./PaymentProvider";

const baseFor = (cfg: PaymentConfig) =>
  cfg.mode === "live"
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout";

type TokenCache = { idToken: string; expiresAt: number };

export class BkashProvider implements PaymentProvider {
  readonly method = "BKASH" as const;
  // Cache keyed by app key so changing credentials in admin invalidates it.
  private tokens = new Map<string, TokenCache>();

  isConfigured(cfg: PaymentConfig): boolean {
    const c = cfg.bkash;
    return c.enabled && Boolean(c.appKey && c.appSecret && c.username && c.password);
  }

  /** Grant (and cache) an id_token. bKash tokens last ~1h; refresh early. */
  private async grantToken(cfg: PaymentConfig): Promise<string> {
    const c = cfg.bkash;
    const cached = this.tokens.get(c.appKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.idToken;
    const res = await fetch(`${baseFor(cfg)}/token/grant`, {
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
    this.tokens.set(c.appKey, { idToken: data.id_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 });
    return data.id_token;
  }

  private async authHeaders(cfg: PaymentConfig) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: await this.grantToken(cfg),
      "x-app-key": cfg.bkash.appKey,
    };
  }

  async initiate(ctx: InitiateContext, cfg: PaymentConfig): Promise<InitiateResult> {
    const res = await fetch(`${baseFor(cfg)}/create`, {
      method: "POST",
      headers: await this.authHeaders(cfg),
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

  async verify(orderNumber: string, params: Record<string, unknown>, cfg: PaymentConfig): Promise<VerifyResult> {
    const paymentID = (params.paymentID as string) || "";
    const status = ((params.status as string) || "").toLowerCase();

    if (!paymentID) return { outcome: "FAILED", raw: params };
    if (status === "cancel") return { outcome: "CANCELLED", raw: params };
    if (status === "failure") return { outcome: "FAILED", raw: params };

    // Settle the transaction server-side with execute; fall back to query when
    // execute was already run (duplicate callback + IPN, or reconciliation).
    let exec = await this.execute(paymentID, cfg);
    if (exec.transactionStatus !== "Completed") {
      exec = await this.query(paymentID, cfg);
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

  private async execute(paymentID: string, cfg: PaymentConfig) {
    const res = await fetch(`${baseFor(cfg)}/execute`, {
      method: "POST",
      headers: await this.authHeaders(cfg),
      body: JSON.stringify({ paymentID }),
    });
    return (await res.json()) as { transactionStatus?: string; trxID?: string; amount?: string; merchantInvoiceNumber?: string; statusMessage?: string };
  }

  private async query(paymentID: string, cfg: PaymentConfig) {
    const res = await fetch(`${baseFor(cfg)}/payment/status`, {
      method: "POST",
      headers: await this.authHeaders(cfg),
      body: JSON.stringify({ paymentID }),
    });
    return (await res.json()) as { transactionStatus?: string; trxID?: string; amount?: string; merchantInvoiceNumber?: string };
  }
}

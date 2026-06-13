/**
 * SSLCommerz hosted checkout (spec §5).
 * Flow: initiate → customer pays on SSLCommerz page → gateway POSTs to our
 * success/fail/cancel/IPN URLs with a `val_id` → we call the Validation API
 * server-side to confirm the payment (never trust the redirect alone).
 *
 * Docs: https://developer.sslcommerz.com
 */
import { env } from "../config/env";
import type {
  InitiateContext,
  InitiateResult,
  PaymentProvider,
  VerifyResult,
} from "./PaymentProvider";

const BASE =
  env.paymentMode === "live" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

export class SslCommerzProvider implements PaymentProvider {
  readonly method = "SSLCOMMERZ" as const;

  get configured(): boolean {
    const c = env.payment.sslcommerz;
    return Boolean(c.storeId && c.storePassword);
  }

  async initiate(ctx: InitiateContext): Promise<InitiateResult> {
    const c = env.payment.sslcommerz;
    const form = new URLSearchParams({
      store_id: c.storeId,
      store_passwd: c.storePassword,
      total_amount: ctx.amount.toFixed(2),
      currency: "BDT",
      tran_id: ctx.orderNumber,
      // Gateway redirects the customer to these after payment.
      success_url: `${ctx.callbackBaseUrl}/success`,
      fail_url: `${ctx.callbackBaseUrl}/fail`,
      cancel_url: `${ctx.callbackBaseUrl}/cancel`,
      ipn_url: `${ctx.callbackBaseUrl}/ipn`,
      shipping_method: "Courier",
      product_name: `Order ${ctx.orderNumber}`,
      product_category: "General",
      product_profile: "general",
      cus_name: ctx.customer.name,
      cus_email: ctx.customer.email,
      cus_phone: ctx.customer.phone,
      cus_add1: "N/A",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
    });

    const res = await fetch(`${BASE}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await res.json()) as { status?: string; GatewayPageURL?: string; sessionkey?: string; failedreason?: string };
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error(`SSLCommerz init failed: ${data.failedreason || data.status || "unknown error"}`);
    }
    return { redirectUrl: data.GatewayPageURL, gatewayReference: data.sessionkey, raw: data };
  }

  async verify(orderNumber: string, params: Record<string, unknown>): Promise<VerifyResult> {
    const valId = (params.val_id as string) || "";
    const status = (params.status as string) || "";

    // Customer-cancelled / failed redirects carry no val_id.
    if (!valId) {
      return { outcome: status.toUpperCase() === "CANCELLED" ? "CANCELLED" : "FAILED", raw: params };
    }

    // Server-to-server validation — the authoritative source of truth.
    const c = env.payment.sslcommerz;
    const url = new URL(`${BASE}/validator/api/validationserverAPI.php`);
    url.searchParams.set("val_id", valId);
    url.searchParams.set("store_id", c.storeId);
    url.searchParams.set("store_passwd", c.storePassword);
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status?: string; // VALID | VALIDATED | INVALID_TRANSACTION | FAILED
      tran_id?: string;
      amount?: string;
      currency?: string;
      bank_tran_id?: string;
    };

    const ok = data.status === "VALID" || data.status === "VALIDATED";
    if (!ok) return { outcome: "FAILED", gatewayTransactionId: data.bank_tran_id || valId, raw: data };

    // Anti cross-order-replay: the validated transaction MUST be for THIS order
    // (tran_id was set to our orderNumber at initiate), and in BDT.
    if (data.tran_id !== orderNumber) {
      return { outcome: "FAILED", gatewayTransactionId: data.bank_tran_id || valId, raw: { reason: "tran_id mismatch", expected: orderNumber, got: data.tran_id, data } };
    }
    if (data.currency && data.currency !== "BDT") {
      return { outcome: "FAILED", gatewayTransactionId: data.bank_tran_id || valId, raw: { reason: "currency mismatch", data } };
    }

    return {
      outcome: "PAID",
      gatewayTransactionId: data.bank_tran_id || valId,
      amount: data.amount ? Number(data.amount) : undefined,
      raw: data,
    };
  }
}

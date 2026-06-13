/**
 * Nagad Payment Gateway (spec §5).
 * Flow:
 *   1. initialize → get paymentReferenceId + challenge
 *   2. complete   → get callBackUrl, redirect customer there
 *   3. customer pays; Nagad redirects to our callback with payment_ref_id+status
 *   4. verify() → GET verify/payment/{ref} server-side; trust only "Success"
 *
 * All sensitive payloads are encrypted with Nagad's PG public key and signed
 * with the merchant private key (see nagadCrypto).
 *
 * Docs: https://nagad.com.bd (merchant onboarding) / Nagad PG integration guide
 */
import { env } from "../config/env";
import type {
  InitiateContext,
  InitiateResult,
  PaymentProvider,
  VerifyResult,
} from "./PaymentProvider";
import {
  decryptWithMerchantPrivateKey,
  encryptWithPgPublicKey,
  randomChallenge,
  signWithMerchantPrivateKey,
  verifyNagadSignature,
} from "./nagadCrypto";

const BASE =
  env.paymentMode === "live"
    ? "https://api.mynagad.com/remote-payment-gateway-1.0"
    : "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0";

// Nagad stamps requests with a GMT+6 timestamp formatted yyyyMMddHHmmss.
function nagadTimestamp(): string {
  const now = new Date();
  const dhaka = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dhaka.getFullYear()}${p(dhaka.getMonth() + 1)}${p(dhaka.getDate())}${p(dhaka.getHours())}${p(dhaka.getMinutes())}${p(dhaka.getSeconds())}`;
}

export class NagadProvider implements PaymentProvider {
  readonly method = "NAGAD" as const;

  get configured(): boolean {
    const c = env.payment.nagad;
    return Boolean(c.merchantId && c.merchantPrivateKey && c.pgPublicKey);
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-KM-Api-Version": "v-0.2.0",
      "X-KM-IP-V4": "127.0.0.1",
      "X-KM-Client-Type": "PC_WEB",
    };
  }

  private sensitive(obj: Record<string, unknown>) {
    const plain = JSON.stringify(obj);
    return {
      sensitiveData: encryptWithPgPublicKey(plain, env.payment.nagad.pgPublicKey),
      signature: signWithMerchantPrivateKey(plain, env.payment.nagad.merchantPrivateKey),
    };
  }

  /** Decrypt a Nagad response and verify its signature (fail closed). */
  private decrypt(sensitiveData: string, signature?: string): Record<string, unknown> {
    const plain = decryptWithMerchantPrivateKey(sensitiveData, env.payment.nagad.merchantPrivateKey);
    if (signature && !verifyNagadSignature(plain, signature, env.payment.nagad.pgPublicKey)) {
      throw new Error("Nagad response signature verification failed");
    }
    return JSON.parse(plain);
  }

  async initiate(ctx: InitiateContext): Promise<InitiateResult> {
    const c = env.payment.nagad;
    const datetime = nagadTimestamp();

    // Step 1 — initialize
    const initBody = this.sensitive({ merchantId: c.merchantId, datetime, orderId: ctx.orderNumber, challenge: randomChallenge() });
    const initRes = await fetch(`${BASE}/api/dfs/check-out/initialize/${c.merchantId}/${ctx.orderNumber}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ dateTime: datetime, ...initBody }),
    });
    const initJson = (await initRes.json()) as { sensitiveData?: string; signature?: string; reason?: string; message?: string };
    if (!initJson.sensitiveData) throw new Error(`Nagad initialize failed: ${initJson.message || initJson.reason || "no response"}`);
    const initData = this.decrypt(initJson.sensitiveData, initJson.signature) as { paymentReferenceId: string; challenge: string };

    // Step 2 — complete
    const completeBody = this.sensitive({
      merchantId: c.merchantId,
      orderId: ctx.orderNumber,
      currencyCode: "050", // BDT
      amount: ctx.amount.toFixed(2),
      challenge: initData.challenge,
    });
    const completeRes = await fetch(`${BASE}/api/dfs/check-out/complete/${initData.paymentReferenceId}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        ...completeBody,
        merchantCallbackURL: `${ctx.callbackBaseUrl}/callback`,
        additionalMerchantInfo: { productName: `Order ${ctx.orderNumber}` },
      }),
    });
    const completeJson = (await completeRes.json()) as { sensitiveData?: string; signature?: string; status?: string; message?: string };
    if (!completeJson.sensitiveData) throw new Error(`Nagad complete failed: ${completeJson.message || "no response"}`);
    const completeData = this.decrypt(completeJson.sensitiveData, completeJson.signature) as { status: string; callBackUrl: string };
    if (!completeData.callBackUrl) throw new Error("Nagad did not return a callback URL");

    return { redirectUrl: completeData.callBackUrl, gatewayReference: initData.paymentReferenceId, raw: completeData };
  }

  async verify(orderNumber: string, params: Record<string, unknown>): Promise<VerifyResult> {
    const refId = (params.payment_ref_id as string) || (params.paymentRefId as string) || "";
    const status = ((params.status as string) || "").toLowerCase();

    if (!refId) return { outcome: "FAILED", raw: params };
    if (status === "aborted" || status === "cancelled") return { outcome: "CANCELLED", raw: params };

    // Server-side verification — authoritative.
    const res = await fetch(`${BASE}/api/dfs/verify/payment/${refId}`, { headers: this.headers() });
    const data = (await res.json()) as {
      status?: string; issuerPaymentRefNo?: string; amount?: string; paymentRefId?: string; orderId?: string;
    };

    const verifyStatus = (data.status || "").toLowerCase();
    const gatewayTransactionId = data.issuerPaymentRefNo || refId;

    if (verifyStatus === "success") {
      // Anti cross-order-replay: require Nagad's echoed orderId to equal THIS
      // order. Fail closed if absent — a genuine success always carries orderId.
      if (data.orderId !== orderNumber) {
        return { outcome: "FAILED", gatewayTransactionId, raw: { reason: "orderId mismatch/absent", expected: orderNumber, got: data.orderId ?? null, data } };
      }
      return { outcome: "PAID", gatewayTransactionId, amount: data.amount ? Number(data.amount) : undefined, raw: data };
    }
    // Known terminal failures vs indeterminate (→ PENDING, retry later).
    const terminal = ["aborted", "cancelled", "failed"].includes(verifyStatus);
    return { outcome: terminal ? "FAILED" : "PENDING", gatewayTransactionId, raw: data };
  }
}

/**
 * Online payment provider registry (ported from backend/src/payments/index.ts).
 * COD is handled directly in the order flow (no gateway).
 */
import type { PaymentMethod } from "@prisma/client";
import type { PaymentConfig, PaymentProvider } from "./PaymentProvider";
import { BkashProvider } from "./bkash";
import { NagadProvider } from "./nagad";
import { SslCommerzProvider } from "./sslcommerz";

const providers: Partial<Record<PaymentMethod, PaymentProvider>> = {
  BKASH: new BkashProvider(),
  NAGAD: new NagadProvider(),
  SSLCOMMERZ: new SslCommerzProvider(),
};

export function getProvider(method: PaymentMethod): PaymentProvider | null {
  return providers[method] ?? null;
}

/** Online methods + whether each is currently configured (admin/env creds). */
export function listOnlineMethods(cfg: PaymentConfig) {
  return (Object.keys(providers) as PaymentMethod[]).map((method) => ({
    method,
    configured: providers[method]!.isConfigured(cfg),
  }));
}

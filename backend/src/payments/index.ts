import type { PaymentMethod } from "@prisma/client";
import type { PaymentProvider } from "./PaymentProvider";
import { BkashProvider } from "./bkash";
import { NagadProvider } from "./nagad";
import { SslCommerzProvider } from "./sslcommerz";

// Registry of online payment providers. COD is handled directly in the order
// flow (no gateway). Add a new gateway by implementing PaymentProvider and
// registering it here — nothing else changes.
const providers: Partial<Record<PaymentMethod, PaymentProvider>> = {
  BKASH: new BkashProvider(),
  NAGAD: new NagadProvider(),
  SSLCOMMERZ: new SslCommerzProvider(),
};

export function getProvider(method: PaymentMethod): PaymentProvider | null {
  return providers[method] ?? null;
}

/** Public list of online methods + whether each has credentials configured. */
export function listOnlineMethods() {
  return (Object.keys(providers) as PaymentMethod[]).map((method) => ({
    method,
    configured: providers[method]!.configured,
  }));
}

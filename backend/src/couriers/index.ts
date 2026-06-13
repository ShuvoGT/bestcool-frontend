import type { CourierName } from "@prisma/client";
import type { CourierConfig, CourierProvider } from "./CourierProvider";
import { SteadfastProvider } from "./steadfast";
import { PathaoProvider } from "./pathao";
import { RedxProvider } from "./redx";

// Registry of courier providers. Add a courier by implementing CourierProvider
// and registering it here — nothing else changes.
const providers: Record<CourierName, CourierProvider> = {
  STEADFAST: new SteadfastProvider(),
  PATHAO: new PathaoProvider(),
  REDX: new RedxProvider(),
};

export function getCourier(name: CourierName): CourierProvider {
  return providers[name];
}

/** Couriers + whether each is currently configured (admin/.env creds). */
export function listCouriers(cfg: CourierConfig) {
  return (Object.keys(providers) as CourierName[]).map((name) => ({
    name,
    configured: providers[name].isConfigured(cfg),
  }));
}

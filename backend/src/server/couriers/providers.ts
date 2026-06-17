/** Courier provider registry (ported from backend/src/couriers/index.ts). */
import type { CourierName } from "@prisma/client";
import type { CourierConfig, CourierProvider } from "./CourierProvider";
import { SteadfastProvider } from "./steadfast";
import { PathaoProvider } from "./pathao";
import { RedxProvider } from "./redx";

const providers: Record<CourierName, CourierProvider> = {
  STEADFAST: new SteadfastProvider(),
  PATHAO: new PathaoProvider(),
  REDX: new RedxProvider(),
};

export function getCourier(name: CourierName): CourierProvider {
  return providers[name];
}

/** Couriers + whether each is currently configured (admin/env creds). */
export function listCouriers(cfg: CourierConfig) {
  return (Object.keys(providers) as CourierName[]).map((name) => ({
    name,
    configured: providers[name].isConfigured(cfg),
  }));
}

/**
 * Couriers — STUB. Step 7 of the consolidation ports the real Steadfast/Pathao/
 * RedX integrations from backend/src/couriers/* + services/couriers.ts. These
 * move real parcels (and COD money), so they get sandbox testing + an
 * adversarial review before going live.
 */
import { AppError } from "./errors";

const notReady = () => new AppError(501, "Courier integration is not configured yet (step 7).");

export type CourierConfig = Record<string, unknown>;

export async function loadCourierConfig(): Promise<CourierConfig> {
  return {};
}

/** Returns the couriers the admin "Send to Courier" selector should show. */
export function listCouriers(_cfg: CourierConfig): { name: string; configured: boolean }[] {
  return [];
}

export async function sendToCourier(_orderId: string, _input: unknown): Promise<never> {
  throw notReady();
}

export async function refreshCourierStatus(_orderId: string): Promise<never> {
  throw notReady();
}

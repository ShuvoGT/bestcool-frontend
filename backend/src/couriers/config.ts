/**
 * Resolves the active courier configuration (spec §11), mirroring the payment
 * config loader. Credentials are managed from the admin Settings panel and
 * stored in the `Setting` table (courier.*); .env values are fallback defaults.
 * Admin values win. These secrets are admin-only — never in /settings/public.
 */
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import type { CourierConfig, CourierMode } from "./CourierProvider";

const SETTING_KEYS = ["courier.mode", "courier.steadfast", "courier.pathao", "courier.redx"];

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function loadCourierConfig(): Promise<CourierConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const sf = (map.get("courier.steadfast") as Obj) ?? {};
  const pa = (map.get("courier.pathao") as Obj) ?? {};
  const rx = (map.get("courier.redx") as Obj) ?? {};

  const dbMode = str(map.get("courier.mode")).toLowerCase();
  const mode: CourierMode = dbMode === "live" || dbMode === "sandbox" ? (dbMode as CourierMode) : env.courierMode;

  return {
    mode,
    steadfast: {
      enabled: sf.enabled !== false,
      apiKey: str(sf.apiKey) || env.courier.steadfast.apiKey,
      secretKey: str(sf.secretKey) || env.courier.steadfast.secretKey,
    },
    pathao: {
      enabled: pa.enabled !== false,
      clientId: str(pa.clientId) || env.courier.pathao.clientId,
      clientSecret: str(pa.clientSecret) || env.courier.pathao.clientSecret,
      username: str(pa.username) || env.courier.pathao.username,
      password: str(pa.password) || env.courier.pathao.password,
      storeId: str(pa.storeId) || env.courier.pathao.storeId,
    },
    redx: {
      enabled: rx.enabled !== false,
      apiToken: str(rx.apiToken) || env.courier.redx.apiToken,
    },
  };
}

/**
 * Resolves the active courier configuration (ported from
 * backend/src/couriers/config.ts), mirroring the payment config loader.
 * Credentials come from the admin Settings panel (courier.*) with env fallback;
 * admin values win. Secrets are admin-only — never in /api/settings/public.
 */
import { prisma } from "@/lib/prisma";
import type { CourierConfig, CourierMode } from "./CourierProvider";

const SETTING_KEYS = ["courier.mode", "courier.steadfast", "courier.pathao", "courier.redx"];

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// Validate the env fallback mode: an unrecognised COURIER_MODE falls back to
// "sandbox" (fail safe — a typo never silently dispatches via live couriers).
const rawCourierMode = (process.env.COURIER_MODE || "sandbox").trim().toLowerCase();
if (rawCourierMode !== "sandbox" && rawCourierMode !== "live") {
  console.warn(`⚠ COURIER_MODE="${process.env.COURIER_MODE}" is invalid — falling back to "sandbox".`);
}
const envMode: CourierMode = rawCourierMode === "live" ? "live" : "sandbox";
const env = {
  steadfast: { apiKey: process.env.STEADFAST_API_KEY || "", secretKey: process.env.STEADFAST_SECRET_KEY || "" },
  pathao: {
    clientId: process.env.PATHAO_CLIENT_ID || "",
    clientSecret: process.env.PATHAO_CLIENT_SECRET || "",
    username: process.env.PATHAO_USERNAME || "",
    password: process.env.PATHAO_PASSWORD || "",
    storeId: process.env.PATHAO_STORE_ID || "",
  },
  redx: { apiToken: process.env.REDX_API_TOKEN || "" },
};

export async function loadCourierConfig(): Promise<CourierConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const sf = (map.get("courier.steadfast") as Obj) ?? {};
  const pa = (map.get("courier.pathao") as Obj) ?? {};
  const rx = (map.get("courier.redx") as Obj) ?? {};

  const dbMode = str(map.get("courier.mode")).toLowerCase();
  const mode: CourierMode = dbMode === "live" || dbMode === "sandbox" ? (dbMode as CourierMode) : envMode;

  return {
    mode,
    steadfast: {
      enabled: sf.enabled !== false,
      apiKey: str(sf.apiKey) || env.steadfast.apiKey,
      secretKey: str(sf.secretKey) || env.steadfast.secretKey,
    },
    pathao: {
      enabled: pa.enabled !== false,
      clientId: str(pa.clientId) || env.pathao.clientId,
      clientSecret: str(pa.clientSecret) || env.pathao.clientSecret,
      username: str(pa.username) || env.pathao.username,
      password: str(pa.password) || env.pathao.password,
      storeId: str(pa.storeId) || env.pathao.storeId,
    },
    redx: {
      enabled: rx.enabled !== false,
      apiToken: str(rx.apiToken) || env.redx.apiToken,
    },
  };
}

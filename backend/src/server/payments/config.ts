/**
 * Resolves the active payment configuration (ported from
 * backend/src/payments/config.ts). Credentials come from the admin Settings
 * panel (DB) with env vars as fallback; admin values win. A gateway is
 * "available" only when enabled AND all its credentials are present. These
 * secrets are admin-only — never included in /api/settings/public.
 */
import { prisma } from "@/lib/prisma";
import type { PaymentConfig, PaymentMode } from "./PaymentProvider";

const SETTING_KEYS = ["payment.mode", "payment.bkash", "payment.nagad", "payment.sslcommerz"];

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// Validate the env fallback mode: an unrecognised PAYMENT_MODE falls back to
// "sandbox" (fail safe — a typo never silently routes real customers to live).
const rawPaymentMode = (process.env.PAYMENT_MODE || "sandbox").trim().toLowerCase();
if (rawPaymentMode !== "sandbox" && rawPaymentMode !== "live") {
  console.warn(`⚠ PAYMENT_MODE="${process.env.PAYMENT_MODE}" is invalid — falling back to "sandbox".`);
}
const envMode: PaymentMode = rawPaymentMode === "live" ? "live" : "sandbox";
const env = {
  bkash: {
    appKey: process.env.BKASH_APP_KEY || "",
    appSecret: process.env.BKASH_APP_SECRET || "",
    username: process.env.BKASH_USERNAME || "",
    password: process.env.BKASH_PASSWORD || "",
  },
  nagad: {
    merchantId: process.env.NAGAD_MERCHANT_ID || "",
    merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY || "",
    pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY || "",
  },
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || "",
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
  },
};

export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const bkashDb = (map.get("payment.bkash") as Obj) ?? {};
  const nagadDb = (map.get("payment.nagad") as Obj) ?? {};
  const sslDb = (map.get("payment.sslcommerz") as Obj) ?? {};

  const dbMode = str(map.get("payment.mode")).toLowerCase();
  const mode: PaymentMode = dbMode === "live" || dbMode === "sandbox" ? (dbMode as PaymentMode) : envMode;

  return {
    mode,
    bkash: {
      enabled: bkashDb.enabled !== false,
      appKey: str(bkashDb.appKey) || env.bkash.appKey,
      appSecret: str(bkashDb.appSecret) || env.bkash.appSecret,
      username: str(bkashDb.username) || env.bkash.username,
      password: str(bkashDb.password) || env.bkash.password,
    },
    nagad: {
      enabled: nagadDb.enabled !== false,
      merchantId: str(nagadDb.merchantId) || env.nagad.merchantId,
      merchantPrivateKey: str(nagadDb.merchantPrivateKey) || env.nagad.merchantPrivateKey,
      pgPublicKey: str(nagadDb.pgPublicKey) || env.nagad.pgPublicKey,
    },
    sslcommerz: {
      enabled: sslDb.enabled !== false,
      storeId: str(sslDb.storeId) || env.sslcommerz.storeId,
      storePassword: str(sslDb.storePassword) || env.sslcommerz.storePassword,
    },
  };
}

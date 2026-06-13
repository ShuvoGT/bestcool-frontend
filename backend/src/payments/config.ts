/**
 * Resolves the active payment configuration (spec §2.2 / §5).
 *
 * Credentials are managed from the admin Settings panel and stored in the
 * `Setting` table; .env values act as fallback defaults. Admin values win.
 * A gateway is "available" only when enabled AND all its credentials are
 * present, so the storefront can hide unconfigured methods entirely.
 *
 * These secrets are admin-only — they are never included in /settings/public.
 */
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import type { PaymentConfig, PaymentMode } from "./PaymentProvider";

const SETTING_KEYS = ["payment.mode", "payment.bkash", "payment.nagad", "payment.sslcommerz"];

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const bkashDb = (map.get("payment.bkash") as Obj) ?? {};
  const nagadDb = (map.get("payment.nagad") as Obj) ?? {};
  const sslDb = (map.get("payment.sslcommerz") as Obj) ?? {};

  const dbMode = str(map.get("payment.mode")).toLowerCase();
  const mode: PaymentMode = dbMode === "live" || dbMode === "sandbox" ? (dbMode as PaymentMode) : env.paymentMode;

  return {
    mode,
    bkash: {
      enabled: bkashDb.enabled !== false,
      appKey: str(bkashDb.appKey) || env.payment.bkash.appKey,
      appSecret: str(bkashDb.appSecret) || env.payment.bkash.appSecret,
      username: str(bkashDb.username) || env.payment.bkash.username,
      password: str(bkashDb.password) || env.payment.bkash.password,
    },
    nagad: {
      enabled: nagadDb.enabled !== false,
      merchantId: str(nagadDb.merchantId) || env.payment.nagad.merchantId,
      merchantPrivateKey: str(nagadDb.merchantPrivateKey) || env.payment.nagad.merchantPrivateKey,
      pgPublicKey: str(nagadDb.pgPublicKey) || env.payment.nagad.pgPublicKey,
    },
    sslcommerz: {
      enabled: sslDb.enabled !== false,
      storeId: str(sslDb.storeId) || env.payment.sslcommerz.storeId,
      storePassword: str(sslDb.storePassword) || env.payment.sslcommerz.storePassword,
    },
  };
}

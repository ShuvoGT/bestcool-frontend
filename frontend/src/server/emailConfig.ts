/**
 * Resolves the active SMTP/email configuration (ported from
 * backend/src/lib/emailConfig.ts).
 *
 * Managed from Admin → Settings (Setting key `email.smtp`) with the app's
 * SMTP_* env vars as fallback defaults — admin values win, so the store owner
 * can change the sending address / app password without a redeploy.
 *
 * The app password is admin-only: `email.` is NOT a public setting prefix, so
 * it is never returned by /api/settings/public.
 */
import { prisma } from "@/lib/prisma";

export type EmailConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const envFallback = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.MAIL_FROM || "Best Cool Electronics <no-reply@bestcoolelectronics.com>",
};

export async function loadEmailConfig(): Promise<EmailConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "email.smtp" } }).catch(() => null);
  const db = (row?.value as Record<string, unknown>) ?? {};
  return {
    enabled: db.enabled !== false,
    host: str(db.host) || envFallback.host,
    port: Number(db.port) || envFallback.port,
    secure: typeof db.secure === "boolean" ? db.secure : envFallback.secure,
    user: str(db.user) || envFallback.user,
    pass: str(db.pass) || envFallback.pass,
    from: str(db.from) || envFallback.from,
  };
}

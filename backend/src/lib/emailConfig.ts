/**
 * Resolves the active SMTP/email configuration.
 *
 * Managed from the admin Settings panel (Setting key `email.smtp`) with the
 * backend .env (SMTP_*) acting as fallback defaults — admin values win, so the
 * store owner can change the sending address / app password without a redeploy.
 *
 * The app password is admin-only: `email.` is NOT a public setting prefix, so
 * it is never returned by /settings/public.
 */
import { prisma } from "./prisma";
import { env } from "../config/env";

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

export async function loadEmailConfig(): Promise<EmailConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "email.smtp" } }).catch(() => null);
  const db = (row?.value as Record<string, unknown>) ?? {};
  return {
    enabled: db.enabled !== false,
    host: str(db.host) || env.smtp.host,
    port: Number(db.port) || env.smtp.port,
    secure: typeof db.secure === "boolean" ? db.secure : env.smtp.secure,
    user: str(db.user) || env.smtp.user,
    pass: str(db.pass) || env.smtp.pass,
    from: str(db.from) || env.smtp.from,
  };
}

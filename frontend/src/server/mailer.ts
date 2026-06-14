/**
 * Nodemailer transport (ported from backend/src/lib/mailer.ts).
 * Reads the admin `email.smtp` setting (with SMTP_* env fallback). Step 6 of the
 * consolidation — the whole migration off Render was motivated by Render's free
 * tier blocking outbound SMTP; on Hostinger this sends for real.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { loadEmailConfig, type EmailConfig } from "./emailConfig";

// Transporter is cached and rebuilt whenever the resolved config changes (e.g.
// the admin updates SMTP settings) — no restart needed.
let cached: { sig: string; transporter: Transporter } | null = null;

function transporterFor(c: EmailConfig): Transporter {
  const sig = `${c.host}|${c.port}|${c.secure}|${c.user}|${c.pass}`;
  if (!cached || cached.sig !== sig) {
    cached = {
      sig,
      transporter: nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure,
        auth: { user: c.user, pass: c.pass },
      }),
    };
  }
  return cached.transporter;
}

/**
 * Sends an email, or logs it to the console when SMTP isn't configured.
 * Never throws — email failures must not break core flows.
 */
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const cfg = await loadEmailConfig();
  if (!cfg.enabled || !cfg.host || !cfg.user) {
    console.log(`\n[MAIL → console] To: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }
  try {
    await transporterFor(cfg).sendMail({ from: cfg.from, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err);
  }
}

/**
 * Verifies the current SMTP config and sends a test email. Unlike sendMail this
 * THROWS on failure, so the admin "Send test email" action can report the exact
 * error (bad app password, wrong host, etc.).
 */
export async function sendTestEmail(to: string): Promise<void> {
  const cfg = await loadEmailConfig();
  if (!cfg.host || !cfg.user) {
    throw new Error("SMTP is not configured — fill in host and username, save settings, then test.");
  }
  const t = transporterFor(cfg);
  await t.verify();
  await t.sendMail({
    from: cfg.from,
    to,
    subject: "Test email ✅ — your store can send email",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b">
      <p>This is a test email from your store's admin panel.</p>
      <p>If you received it, customer emails (order confirmations and auto-created
      account credentials) will be delivered correctly.</p>
    </div>`,
  });
}

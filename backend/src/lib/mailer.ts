import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtp.host || !env.smtp.user) return null; // not configured
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Sends an email, or logs it to the console when SMTP isn't configured
 * (development). Never throws — email failures must not break core flows.
 */
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[MAIL → console] To: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err);
  }
}

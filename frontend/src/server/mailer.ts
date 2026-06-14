/**
 * Mailer — TEMPORARY stub. Step 6 of the consolidation replaces this with a
 * nodemailer transport reading the `email.smtp` admin setting (with SMTP_* env
 * fallback), ported from backend/src/lib/{emailConfig,mailer}.ts.
 *
 * For now it logs the message so dev flows (password reset, order emails) work
 * without a configured SMTP server.
 */
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  console.log(`[mailer:stub] → ${to} | ${subject}\n${html}`);
}

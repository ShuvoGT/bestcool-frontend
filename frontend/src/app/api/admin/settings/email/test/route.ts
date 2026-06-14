import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sendTestEmail } from "@/server/mailer";

const testBody = z.object({ to: z.string().email("Enter a valid recipient email") });

// Send a test email using the currently-saved SMTP config (save before testing).
export async function POST(req: NextRequest) {
  try {
    await requirePermission("settings");
    const body = testBody.parse(await req.json());
    try {
      await sendTestEmail(body.to);
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : "Failed to send test email");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

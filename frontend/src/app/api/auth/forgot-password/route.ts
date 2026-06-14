import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { sendMail } from "@/server/mailer";

const schema = z.object({ email: z.string().email().transform((v) => v.toLowerCase()) });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond OK — never reveal whether an email is registered.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const link = `${SITE_URL}/reset-password?token=${token}`;
      await sendMail(
        user.email,
        "Reset your Best Cool Electronics password",
        `<p>Hi ${user.name},</p><p>Click the link below to set a new password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

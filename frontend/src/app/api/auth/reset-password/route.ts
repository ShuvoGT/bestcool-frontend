import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, handleError } from "@/server/errors";
import { authLimit } from "@/server/rateLimit";

const schema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: NextRequest) {
  try {
    authLimit(req);
    const { token, newPassword } = schema.parse(await req.json());
    const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw badRequest("This reset link is invalid or has expired");
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

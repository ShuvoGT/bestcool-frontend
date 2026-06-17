import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.password))) {
      throw badRequest("Current password is incorrect");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(body.newPassword, 10), mustChangePassword: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

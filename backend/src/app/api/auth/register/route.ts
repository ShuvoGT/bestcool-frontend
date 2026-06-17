import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conflict, handleError } from "@/server/errors";
import { signToken } from "@/server/jwt";
import { setAuthCookie, publicUser } from "@/server/auth";
import { authLimit } from "@/server/rateLimit";

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(11).max(15).optional(),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: NextRequest) {
  try {
    authLimit(req);
    const { name, email, phone, password } = schema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists");
    const user = await prisma.user.create({
      data: { name, email, phone: phone ?? null, password: await bcrypt.hash(password, 10), role: "CUSTOMER" },
    });
    await setAuthCookie(signToken({ sub: user.id, role: user.role }));
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

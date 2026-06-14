import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handleError, unauthorized } from "@/server/errors";
import { signToken } from "@/server/jwt";
import { setAuthCookie, publicUser } from "@/server/auth";
import { authLimit } from "@/server/rateLimit";

// Accept an email OR a username in the `email` field (WordPress-style login).
const schema = z.object({ email: z.string().min(1).max(100), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    authLimit(req);
    const { email, password } = schema.parse(await req.json());
    const identifier = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw unauthorized("Invalid credentials");
    }
    if (user.role !== "CUSTOMER" && !user.isActive) {
      throw unauthorized("Your account has been deactivated. Contact an administrator.");
    }
    await setAuthCookie(signToken({ sub: user.id, role: user.role }));
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}

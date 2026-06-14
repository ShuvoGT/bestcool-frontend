import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest, conflict, notFound } from "@/server/errors";
import { requireAdmin } from "@/server/auth";
import { optionalUsername, cleanPermissions, otherActiveAdmins, staffSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

const updateBody = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().transform((v) => v.toLowerCase()).optional(),
  username: optionalUsername,
  phone: z.string().min(11).max(15).nullable().optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  staffRole: z.string().max(50).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// --- Update ---------------------------------------------------------------
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAdmin();
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role === "CUSTOMER") throw notFound("User not found");

    const b = updateBody.parse(await req.json());
    const isSelf = target.id === me.id;

    // Lockout guards.
    if (isSelf && b.role && b.role !== "ADMIN") throw badRequest("You can't change your own role");
    if (isSelf && b.isActive === false) throw badRequest("You can't deactivate your own account");
    const losingAdmin = target.role === "ADMIN" && ((b.role && b.role !== "ADMIN") || b.isActive === false);
    if (losingAdmin && (await otherActiveAdmins(target.id)) === 0) {
      throw badRequest("This is the last active administrator — promote another admin first");
    }

    // Uniqueness checks for changed email/username.
    if (b.email && b.email !== target.email && (await prisma.user.findUnique({ where: { email: b.email } }))) {
      throw conflict("An account with this email already exists");
    }
    if (b.username && b.username !== target.username && (await prisma.user.findUnique({ where: { username: b.username } }))) {
      throw conflict("This username is already taken");
    }

    const nextRole = b.role ?? target.role;
    const data: Prisma.UserUpdateInput = {
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.email !== undefined ? { email: b.email } : {}),
      ...(b.username !== undefined ? { username: b.username } : {}),
      ...(b.phone !== undefined ? { phone: b.phone } : {}),
      ...(b.role !== undefined ? { role: b.role } : {}),
      ...(b.staffRole !== undefined ? { staffRole: b.staffRole } : {}),
      ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
      ...(b.password ? { password: await bcrypt.hash(b.password, 10), mustChangePassword: false } : {}),
      // Permissions only apply to STAFF; an ADMIN always has all (stored as []).
      ...(nextRole === "ADMIN" ? { permissions: [] } : b.permissions ? { permissions: cleanPermissions(b.permissions) } : {}),
    };
    const user = await prisma.user.update({ where: { id: target.id }, data, select: staffSelect });
    return NextResponse.json({ user });
  } catch (err) {
    return handleError(err);
  }
}

// --- Delete ---------------------------------------------------------------
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAdmin();
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role === "CUSTOMER") throw notFound("User not found");
    if (target.id === me.id) throw badRequest("You can't delete your own account");
    if (target.role === "ADMIN" && (await otherActiveAdmins(target.id)) === 0) {
      throw badRequest("This is the last active administrator — promote another admin first");
    }
    try {
      await prisma.user.delete({ where: { id: target.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        // Has related records (orders/reviews) — deactivate instead of deleting.
        await prisma.user.update({ where: { id: target.id }, data: { isActive: false } });
        return NextResponse.json({ ok: true, deactivated: true });
      }
      throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

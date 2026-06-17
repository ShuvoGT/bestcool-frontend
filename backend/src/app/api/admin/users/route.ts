import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, conflict } from "@/server/errors";
import { requireAdmin } from "@/server/auth";
import { isPermission } from "@/server/permissions";

export const staffSelect = {
  id: true, name: true, email: true, username: true, phone: true,
  role: true, staffRole: true, permissions: true, isActive: true, createdAt: true,
} satisfies Prisma.UserSelect;

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dot and underscore");

// Normalise an optional username field ("" → null) and lower-case it.
export const optionalUsername = z
  .union([usernameSchema, z.literal("")])
  .nullish()
  .transform((v) => (v ? v.toLowerCase() : null));

export const cleanPermissions = (perms: string[] | undefined): string[] =>
  Array.from(new Set((perms ?? []).filter(isPermission)));

/** Count active admins other than the given user — used to prevent lockout. */
export async function otherActiveAdmins(excludeId: string): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: excludeId } } });
}

const querySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- List staff & admins --------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const where: Prisma.UserWhereInput = {
      role: { in: ["ADMIN", "STAFF"] },
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { email: { contains: q.search } },
              { username: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: staffSelect,
      }),
    ]);
    return NextResponse.json({ items: users, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
  } catch (err) {
    return handleError(err);
  }
}

const createBody = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().transform((v) => v.toLowerCase()),
  username: optionalUsername,
  phone: z.string().min(11).max(15).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["ADMIN", "STAFF"]),
  staffRole: z.string().max(50).optional(),
  permissions: z.array(z.string()).optional(),
});

// --- Create ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = createBody.parse(await req.json());
    const { name, email, username, phone, password, role, staffRole } = body;
    if (await prisma.user.findUnique({ where: { email } })) {
      throw conflict("An account with this email already exists");
    }
    if (username && (await prisma.user.findUnique({ where: { username } }))) {
      throw conflict("This username is already taken");
    }
    const permissions = role === "ADMIN" ? [] : cleanPermissions(body.permissions);
    const user = await prisma.user.create({
      data: {
        name, email, username, phone: phone ?? null,
        password: await bcrypt.hash(password, 10),
        role,
        staffRole: role === "ADMIN" ? "administrator" : staffRole ?? "custom",
        permissions,
        isActive: true,
      },
      select: staffSelect,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

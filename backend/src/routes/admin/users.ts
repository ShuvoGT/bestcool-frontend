/** Admin-only staff & user management (WordPress-style roles + permissions). */
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, badRequest, conflict, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PRESETS, isPermission } from "../../lib/permissions";

export const adminUsersRouter = Router();

const staffSelect = {
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
const optionalUsername = z
  .union([usernameSchema, z.literal("")])
  .nullish()
  .transform((v) => (v ? v.toLowerCase() : null));

const cleanPermissions = (perms: string[] | undefined): string[] =>
  Array.from(new Set((perms ?? []).filter(isPermission)));

/** Count active admins other than the given user — used to prevent lockout. */
async function otherActiveAdmins(excludeId: string): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: excludeId } } });
}

// --- Capabilities & presets (for the form) --------------------------------
adminUsersRouter.get("/capabilities", (_req, res) => {
  res.json({
    permissions: PERMISSIONS.map((key) => ({ key, label: PERMISSION_LABELS[key] })),
    presets: ROLE_PRESETS,
  });
});

// --- List staff & admins --------------------------------------------------
adminUsersRouter.get(
  "/",
  validate({
    query: z.object({
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { search?: string; page: number; limit: number };
    const where: Prisma.UserWhereInput = {
      role: { in: ["ADMIN", "STAFF"] },
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { email: { contains: q.search, mode: "insensitive" } },
              { username: { contains: q.search, mode: "insensitive" } },
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
    res.json({ items: users, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
  })
);

// --- Create ---------------------------------------------------------------
adminUsersRouter.post(
  "/",
  validate({
    body: z.object({
      name: z.string().min(2).max(100),
      email: z.string().email().transform((v) => v.toLowerCase()),
      username: optionalUsername,
      phone: z.string().min(11).max(15).optional(),
      password: z.string().min(8, "Password must be at least 8 characters").max(100),
      role: z.enum(["ADMIN", "STAFF"]),
      staffRole: z.string().max(50).optional(),
      permissions: z.array(z.string()).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { name, email, username, phone, password, role, staffRole } = req.body as {
      name: string; email: string; username: string | null; phone?: string;
      password: string; role: "ADMIN" | "STAFF"; staffRole?: string;
    };
    if (await prisma.user.findUnique({ where: { email } })) {
      throw conflict("An account with this email already exists");
    }
    if (username && (await prisma.user.findUnique({ where: { username } }))) {
      throw conflict("This username is already taken");
    }
    const permissions = role === "ADMIN" ? [] : cleanPermissions(req.body.permissions);
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
    res.status(201).json({ user });
  })
);

// --- Update ---------------------------------------------------------------
adminUsersRouter.put(
  "/:id",
  validate({
    body: z.object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().transform((v) => v.toLowerCase()).optional(),
      username: optionalUsername,
      phone: z.string().min(11).max(15).nullable().optional(),
      password: z.string().min(8).max(100).optional(),
      role: z.enum(["ADMIN", "STAFF"]).optional(),
      staffRole: z.string().max(50).optional(),
      permissions: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.role === "CUSTOMER") throw notFound("User not found");

    const b = req.body as {
      name?: string; email?: string; username?: string | null; phone?: string | null;
      password?: string; role?: "ADMIN" | "STAFF"; staffRole?: string;
      permissions?: string[]; isActive?: boolean;
    };
    const isSelf = target.id === req.user!.id;

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
    res.json({ user });
  })
);

// --- Delete ---------------------------------------------------------------
adminUsersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.role === "CUSTOMER") throw notFound("User not found");
    if (target.id === req.user!.id) throw badRequest("You can't delete your own account");
    if (target.role === "ADMIN" && (await otherActiveAdmins(target.id)) === 0) {
      throw badRequest("This is the last active administrator — promote another admin first");
    }
    try {
      await prisma.user.delete({ where: { id: target.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        // Has related records (orders/reviews) — deactivate instead of deleting.
        await prisma.user.update({ where: { id: target.id }, data: { isActive: false } });
        return res.json({ ok: true, deactivated: true });
      }
      throw e;
    }
    res.json({ ok: true });
  })
);

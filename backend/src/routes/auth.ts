import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { asyncHandler, badRequest, conflict, notFound, unauthorized } from "../lib/errors";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/jwt";
import { sendMail } from "../lib/mailer";
import { env } from "../config/env";

export const authRouter = Router();

const credentialsShape = {
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
};

const publicUser = (u: {
  id: string; name: string; email: string; username?: string | null; phone: string | null;
  role: string; permissions?: string[]; isActive?: boolean; mustChangePassword: boolean;
}) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  username: u.username ?? null,
  phone: u.phone,
  role: u.role,
  permissions: u.permissions ?? [],
  isActive: u.isActive ?? true,
  mustChangePassword: u.mustChangePassword,
});

// --- Register -------------------------------------------------------------
authRouter.post(
  "/register",
  authLimiter,
  validate({
    body: z.object({
      name: z.string().min(2).max(100),
      phone: z.string().min(11).max(15).optional(),
      ...credentialsShape,
    }),
  }),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists");
    const user = await prisma.user.create({
      data: { name, email, phone: phone ?? null, password: await bcrypt.hash(password, 10), role: "CUSTOMER" },
    });
    setAuthCookie(res, signToken({ sub: user.id, role: user.role }));
    res.status(201).json({ user: publicUser(user) });
  })
);

// --- Login ----------------------------------------------------------------
authRouter.post(
  "/login",
  authLimiter,
  // Accept an email OR a username in the `email` field (WordPress-style login).
  validate({ body: z.object({ email: z.string().min(1).max(100), password: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const identifier = (req.body.email as string).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      throw unauthorized("Invalid credentials");
    }
    if (user.role !== "CUSTOMER" && !user.isActive) {
      throw unauthorized("Your account has been deactivated. Contact an administrator.");
    }
    setAuthCookie(res, signToken({ sub: user.id, role: user.role }));
    res.json({ user: publicUser(user) });
  })
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

// --- Profile --------------------------------------------------------------
authRouter.put(
  "/profile",
  requireAuth,
  validate({
    body: z.object({
      name: z.string().min(2).max(100),
      // Optional handle: a valid username, "" to clear it, or omit to leave unchanged.
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dot and underscore only").optional().or(z.literal("")),
      phone: z.string().min(11).max(15).nullable().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const data: Parameters<typeof prisma.user.update>[0]["data"] = {
      name: req.body.name,
      phone: req.body.phone ?? undefined,
    };
    if (req.body.username !== undefined) {
      const lower = req.body.username ? (req.body.username as string).toLowerCase() : null;
      if (lower) {
        const taken = await prisma.user.findFirst({ where: { username: lower, id: { not: req.user!.id } } });
        if (taken) throw conflict("This username is already taken");
      }
      data.username = lower;
    }
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ user: publicUser(user) });
  })
);

// --- Change password (also clears the first-login force flag) --------------
authRouter.put(
  "/change-password",
  requireAuth,
  validate({ body: z.object({ currentPassword: z.string().min(1), newPassword: credentialsShape.password }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(req.body.currentPassword, user.password))) {
      throw badRequest("Current password is incorrect");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(req.body.newPassword, 10), mustChangePassword: false },
    });
    res.json({ ok: true });
  })
);

// --- Forgot / reset password ------------------------------------------------
authRouter.post(
  "/forgot-password",
  authLimiter,
  validate({ body: z.object({ email: credentialsShape.email }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    // Always respond OK — never reveal whether an email is registered.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const link = `${env.frontendUrl}/reset-password?token=${token}`;
      await sendMail(
        user.email,
        "Reset your Next Mart password",
        `<p>Hi ${user.name},</p><p>Click the link below to set a new password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`
      );
    }
    res.json({ ok: true });
  })
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate({ body: z.object({ token: z.string().min(10), newPassword: credentialsShape.password }) }),
  asyncHandler(async (req, res) => {
    const reset = await prisma.passwordResetToken.findUnique({ where: { token: req.body.token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw badRequest("This reset link is invalid or has expired");
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: await bcrypt.hash(req.body.newPassword, 10), mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  })
);

// --- Address book -----------------------------------------------------------
const addressBody = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(11).max(15),
  address: z.string().min(5).max(500),
  district: z.string().min(2).max(100),
  isDefault: z.boolean().optional(),
});

authRouter.get(
  "/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  })
);

authRouter.post(
  "/addresses",
  requireAuth,
  validate({ body: addressBody }),
  asyncHandler(async (req, res) => {
    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({ data: { ...req.body, userId: req.user!.id } });
    res.status(201).json({ address });
  })
);

authRouter.put(
  "/addresses/:id",
  requireAuth,
  validate({ body: addressBody }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) throw notFound("Address not found");
    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({ where: { id: existing.id }, data: req.body });
    res.json({ address });
  })
);

authRouter.delete(
  "/addresses/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) throw notFound("Address not found");
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

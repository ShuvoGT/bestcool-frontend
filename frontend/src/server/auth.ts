/**
 * Cookie-JWT auth for route handlers (ported from backend middleware/auth.ts +
 * utils/jwt cookie helpers). The frontend keeps talking to the same custom
 * /api/auth/* endpoints; we just read/write the httpOnly `token` cookie here.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "./jwt";
import { forbidden, unauthorized } from "./errors";
import { userHasPermission } from "./permissions";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  permissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
};

export const COOKIE_NAME = "token";
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60; // mirrors JWT_EXPIRES_IN=7d

// Consolidated app is same-origin, so `lax` is the right default (the split app
// needed cross-site `none`). Override with COOKIE_SAMESITE=lax|none|strict.
const isProd = process.env.NODE_ENV === "production";
const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase() as "lax" | "none" | "strict";
const secure = isProd || sameSite === "none";

export function authCookieOptions(maxAge: number = COOKIE_MAX_AGE_S) {
  return { httpOnly: true, secure, sameSite, maxAge, path: "/" } as const;
}

/** Writes the auth cookie (call from login/register handlers). */
export async function setAuthCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, authCookieOptions());
}

/** Clears the auth cookie (call from logout). */
export async function clearAuthCookie() {
  (await cookies()).set(COOKIE_NAME, "", authCookieOptions(0));
}

const userSelect = {
  id: true, name: true, email: true, username: true, phone: true,
  role: true, permissions: true, isActive: true, mustChangePassword: true,
} as const;

/** Reads the JWT cookie and returns the user, or null when absent/invalid. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
  if (!user) return null;
  // permissions is JSON (Json? column on MySQL) — normalize to string[].
  return { ...user, permissions: (user.permissions as string[] | null) ?? [] };
}

/** Throws 401 unless authenticated. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw unauthorized();
  return user;
}

/** Gate the whole admin panel: any active ADMIN or STAFF user. */
export async function requireStaff(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role === "CUSTOMER") throw forbidden("Staff access required");
  if (!user.isActive) throw forbidden("Your account has been deactivated");
  return user;
}

/** ADMIN always passes; an active STAFF user passes when holding any of `caps`. */
export async function requirePermission(...caps: string[]): Promise<AuthUser> {
  const user = await requireStaff();
  if (user.role === "ADMIN") return user;
  if (!userHasPermission(user, caps)) throw forbidden("You don't have permission to access this section");
  return user;
}

/** Throws 403 unless ADMIN (user management). */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") throw forbidden("Admin access required");
  return user;
}

/** Public projection of a user, matching the backend's `publicUser` shape. */
export function publicUser(u: {
  id: string; name: string; email: string; username?: string | null; phone: string | null;
  role: string; permissions?: unknown; isActive?: boolean; mustChangePassword: boolean;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username ?? null,
    phone: u.phone,
    role: u.role,
    permissions: (u.permissions as string[] | null) ?? [],
    isActive: u.isActive ?? true,
    mustChangePassword: u.mustChangePassword,
  };
}

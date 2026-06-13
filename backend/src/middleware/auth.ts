import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../utils/jwt";
import { forbidden, unauthorized } from "../lib/errors";
import { userHasPermission } from "../lib/permissions";

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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Reads the JWT cookie and attaches req.user when valid. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true, name: true, email: true, username: true, phone: true,
      role: true, permissions: true, isActive: true, mustChangePassword: true,
    },
  });
  if (user) req.user = user;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "ADMIN") return next(forbidden("Admin access required"));
  next();
}

/** Gate the whole admin panel: any active ADMIN or STAFF user. */
export function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role === "CUSTOMER") return next(forbidden("Staff access required"));
  if (!req.user.isActive) return next(forbidden("Your account has been deactivated"));
  next();
}

/**
 * Gate a section by capability. ADMIN always passes; an active STAFF user passes
 * when they hold any of `caps`. Use after requireStaff on `/api/admin`.
 */
export function requirePermission(...caps: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === "ADMIN") return next();
    if (!req.user.isActive) return next(forbidden("Your account has been deactivated"));
    if (userHasPermission(req.user, caps)) return next();
    next(forbidden("You don't have permission to access this section"));
  };
}

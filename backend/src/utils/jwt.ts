import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../config/env";

export type JwtPayload = { sub: string; role: "ADMIN" | "CUSTOMER" };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

const COOKIE_NAME = "token";
// Mirrors JWT_EXPIRES_IN=7d; cookie expiry is a UX nicety — the JWT itself
// is the real source of truth for session lifetime.
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/" });
}

/** JWT signing/verifying (ported from backend/src/utils/jwt.ts). */
import jwt from "jsonwebtoken";

export type JwtPayload = { sub: string; role: "ADMIN" | "STAFF" | "CUSTOMER" };

// Reuse NEXTAUTH_SECRET as the signing key when a dedicated JWT_SECRET isn't set
// (the consolidated app's .env.local ships NEXTAUTH_SECRET). Resolved lazily so a
// missing secret fails at request time, not at build/import time. Throws (fails
// CLOSED) when neither is set — never sign/HMAC with an empty key. Also used by
// the payment-token HMAC so both share one fail-closed secret resolver.
export function authSecret(): string {
  const s = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (!s) throw new Error("JWT_SECRET (or NEXTAUTH_SECRET) is required");
  return s;
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, authSecret(), { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, authSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

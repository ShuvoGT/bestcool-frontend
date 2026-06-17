/**
 * API error helpers for route handlers (ported from backend/src/lib/errors.ts).
 * Throw an AppError anywhere inside a handler; wrap the handler body in
 * try/catch and pass the error to `handleError` to get a typed JSON response.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Operational error with an HTTP status code, safe to expose to clients. */
export class AppError extends Error {
  constructor(public status: number, message: string, public details?: string[]) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string) => new AppError(400, msg);
export const unauthorized = (msg = "Authentication required") => new AppError(401, msg);
export const forbidden = (msg = "You do not have permission to do this") => new AppError(403, msg);
export const notFound = (msg = "Not found") => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);

/** Turns any thrown value into the same JSON error shape the frontend expects. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, ...(err.details ? { details: err.details } : {}) },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`);
    return NextResponse.json({ error: "Validation failed", details }, { status: 400 });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

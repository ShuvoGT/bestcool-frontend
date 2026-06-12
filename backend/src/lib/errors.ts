import type { NextFunction, Request, Response } from "express";

/** Operational error with an HTTP status code, safe to expose to clients. */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string) => new AppError(400, msg);
export const unauthorized = (msg = "Authentication required") => new AppError(401, msg);
export const forbidden = (msg = "You do not have permission to do this") => new AppError(403, msg);
export const notFound = (msg = "Not found") => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);

/** Wraps async route handlers so rejections reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

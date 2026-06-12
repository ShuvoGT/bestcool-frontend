import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/**
 * Validates request parts against Zod schemas. Parsed (and coerced) values
 * replace the originals so handlers receive typed, clean data.
 */
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`);
        return res.status(400).json({ error: "Validation failed", details });
      }
      next(err);
    }
  };
}

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates `req.body`, `req.params`, and/or `req.query` against Zod schemas.
 * Does not reassign `req.query` or `req.params` (which are read-only getters in Express 5).
 * Throws `ZodError` on invalid input, handled by `errorHandler` as `VALIDATION_ERROR` (400).
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.params) {
      schemas.params.parse(req.params);
    }

    if (schemas.query) {
      schemas.query.parse(req.query);
    }

    next();
  };
}

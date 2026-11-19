import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

/**
 * Middleware factory that restricts access to authenticated users holding one of the specified roles.
 */
export function requireRole(
  ...roles: Array<'DRIVER' | 'OPERATOR' | 'ADMIN'>
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('UNAUTHENTICATED');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('FORBIDDEN');
    }

    next();
  };
}

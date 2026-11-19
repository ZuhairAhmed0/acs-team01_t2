import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { ERROR_CATALOG } from '../errors/catalog.js';
import { logger } from '../utils/logger.js';

/**
 * Global Express error-handling middleware.
 * - AppError -> { error: { code, message, details? } }
 * - ZodError -> VALIDATION_ERROR 400 with field details
 * - unknown -> INTERNAL 500 (logged server-side, never leaks stack)
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn('ErrorHandler', `AppError ${err.code} (${err.httpStatus}): ${err.message}`, {
      code: err.code,
      httpStatus: err.httpStatus,
      method: req.method,
      path: req.originalUrl,
      ...(req.user?.id ? { userId: req.user.id } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });

    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const fieldSummary = details
      .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
      .join('، ');

    logger.warn('ErrorHandler', `ValidationError (400) on ${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      ...(req.user?.id ? { userId: req.user.id } : {}),
      details,
    });

    res.status(ERROR_CATALOG.VALIDATION_ERROR.httpStatus).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: fieldSummary
          ? `${ERROR_CATALOG.VALIDATION_ERROR.message}: ${fieldSummary}`
          : ERROR_CATALOG.VALIDATION_ERROR.message,
        details,
      },
    });
    return;
  }

  logger.error('ErrorHandler', `Unhandled internal error on ${req.method} ${req.originalUrl}`, {
    method: req.method,
    path: req.originalUrl,
    ...(req.user?.id ? { userId: req.user.id } : {}),
    error: err,
  });

  res.status(ERROR_CATALOG.INTERNAL.httpStatus).json({
    error: {
      code: 'INTERNAL',
      message: ERROR_CATALOG.INTERNAL.message,
    },
  });
}

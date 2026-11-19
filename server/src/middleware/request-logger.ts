import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Express middleware that assigns an `X-Request-Id` header and logs every
 * incoming HTTP request upon completion with status code, duration (ms),
 * authenticated user info, and idempotency key when present.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startNs = process.hrtime.bigint();
  const requestId =
    (typeof req.headers['x-request-id'] === 'string' &&
      req.headers['x-request-id'].trim()) ||
    randomUUID().slice(0, 8);

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs =
      Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const roundedMs = Number(durationMs.toFixed(2));
    const status = res.statusCode;

    const meta: Record<string, unknown> = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      durationMs: roundedMs,
      ...(req.user?.id ? { userId: req.user.id, role: req.user.role } : {}),
      ...(req.idempotencyKey ? { idempotencyKey: req.idempotencyKey } : {}),
    };

    const msg = `${req.method} ${req.originalUrl} -> ${status} (${roundedMs}ms)`;

    if (status >= 500) {
      logger.error('HTTP', msg, meta);
    } else if (status >= 400) {
      logger.warn('HTTP', msg, meta);
    } else {
      logger.http('HTTP', msg, meta);
    }
  });

  next();
}


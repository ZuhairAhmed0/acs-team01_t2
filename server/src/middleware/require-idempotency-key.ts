import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 64;

/**
 * Middleware requiring a valid `Idempotency-Key` header (8–64 characters)
 * on money-moving POST endpoints.
 */
export function requireIdempotencyKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const rawKey = req.get('Idempotency-Key');
  const key = typeof rawKey === 'string' ? rawKey.trim() : '';

  if (
    key.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
    key.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED');
  }

  req.idempotencyKey = key;
  next();
}


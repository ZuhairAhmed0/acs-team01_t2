import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

const emptyToUndefined = (val: unknown): unknown =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

/**
 * Query schema for `GET /api/transactions?limit=20&cursor=&type=&status=`.
 */
export const listTransactionsQuerySchema = z.object({
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
  cursor: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  type: z.preprocess(
    emptyToUndefined,
    z.enum(['TOPUP', 'PAYMENT', 'TRANSFER']).optional(),
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  ),
});

/**
 * Params schema for `:id` UUID routes (`GET /api/transactions/:id`, `GET /api/wallets/:id/ledger`).
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Query schema for `GET /api/wallets/:id/ledger?limit=&cursor=`.
 */
export const walletLedgerQuerySchema = z.object({
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
  cursor: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export interface OpaqueCursorPayload {
  createdAt: string;
  id: string;
}

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().min(1),
});

/**
 * Encodes `{ createdAt, id }` into an opaque base64 cursor string.
 */
export function encodeCursor(payload: OpaqueCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

/**
 * Decodes and validates an opaque base64 cursor string.
 * Throws `VALIDATION_ERROR` (400) if malformed.
 */
export function decodeCursor(cursor: string): OpaqueCursorPayload {
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = cursorPayloadSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    throw new AppError('VALIDATION_ERROR');
  }
}


import { z } from 'zod';

const emptyToUndefined = (val: unknown): unknown =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

/**
 * Query schema for `GET /api/operator/payments?limit=&cursor=&stationId=`.
 */
export const operatorPaymentsQuerySchema = z.object({
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
  cursor: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  stationId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

/**
 * Query schema for `GET /api/operator/payments/lookup?code=123456&stationId=`.
 */
export const operatorLookupQuerySchema = z.object({
  code: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().regex(/^\d{6}$/),
  ),
  stationId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

/**
 * Query schema for `GET /api/operator/summary?stationId=` and `PATCH /api/operator/station?stationId=`.
 */
export const operatorStationQuerySchema = z.object({
  stationId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

/**
 * Body schema for `PATCH /api/operator/station { congestion: 'LOW' | 'MEDIUM' | 'HIGH' }`.
 */
export const updateStationCongestionSchema = z.object({
  congestion: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  stationId: z.string().uuid().optional(),
});

/**
 * Body schema for `PATCH /api/operator/assign-station { stationId }`.
 */
export const assignOperatorStationSchema = z.object({
  stationId: z.string().uuid(),
});

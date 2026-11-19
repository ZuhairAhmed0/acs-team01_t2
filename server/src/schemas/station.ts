import { z } from 'zod';

/**
 * Query schema for `GET /api/stations?city=`.
 */
export const stationListQuerySchema = z.object({
  city: z.string().optional(),
});

/**
 * Route params schema for `GET /api/stations/:id`.
 */
export const stationIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Body schema for creating a station (`POST /api/stations` or `POST /api/admin/stations`).
 */
export const createStationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80),
  address: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().max(255).nullable().optional(),
  ),
  congestion: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  isActive: z.boolean().default(true),
});

/**
 * Body schema for editing a station (`PATCH /api/stations/:id` or `PATCH /api/admin/stations/:id`).
 */
export const updateStationSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    address: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
      z.string().trim().max(255).nullable().optional(),
    ),
    congestion: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

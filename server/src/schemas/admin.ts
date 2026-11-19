import { z } from 'zod';
import { createStationSchema, updateStationSchema } from './station.js';

/**
 * Request body schema for `POST /api/admin/stations`.
 */
export const createAdminStationSchema = createStationSchema;

/**
 * Request body schema for `PATCH /api/admin/stations/:id`.
 */
export const patchAdminStationSchema = updateStationSchema;

/**
 * Request body schema for `PATCH /api/admin/users/:id`.
 */
export const patchAdminUserSchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN']),
});

import { z } from 'zod';
import { amountSchema } from './money.js';

/**
 * Request body schema for `POST /api/topups`.
 */
export const createTopupSchema = z.object({
  amount: amountSchema,
});

/**
 * Request body schema for `POST /api/admin/bank-status`.
 */
export const updateBankStatusSchema = z.object({
  status: z.enum(['UP', 'DOWN']),
});


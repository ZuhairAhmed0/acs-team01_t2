import { z } from 'zod';
import { amountSchema } from './money.js';

/**
 * Request body schema for `POST /api/payments`.
 */
export const createPaymentSchema = z.object({
  stationId: z.string().uuid(),
  sourceWalletId: z.string().uuid(),
  amount: amountSchema,
});


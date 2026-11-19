import { z } from 'zod';
import { amountSchema } from './money.js';

export const transferDestinationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MAIN'),
  }),
  z.object({
    type: z.literal('STATION'),
    stationId: z.string().uuid(),
  }),
]);

export type TransferDestination = z.infer<typeof transferDestinationSchema>;

/**
 * Request body schema for `POST /api/transfers`.
 */
export const createTransferSchema = z.object({
  fromWalletId: z.string().uuid(),
  to: transferDestinationSchema,
  amount: amountSchema,
});


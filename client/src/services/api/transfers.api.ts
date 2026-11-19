import { apiClient } from '../../lib/axios.js';
import type { ApiEnvelope, TransactionDto } from '../../types/api.types.js';

export type TransferDestination =
  | { type: 'MAIN' }
  | { type: 'STATION'; stationId: string };

export interface CreateTransferParams {
  fromWalletId: string;
  to: TransferDestination;
  amount: number;
  idempotencyKey: string;
}

/**
 * Executes an atomic wallet-to-wallet transfer (`MAIN -> STATION`, `STATION -> STATION`, or `STATION -> MAIN`).
 * Endpoint: `POST /api/transfers` with mandatory `Idempotency-Key` header.
 */
export async function createTransferRequest({
  fromWalletId,
  to,
  amount,
  idempotencyKey,
}: CreateTransferParams): Promise<TransactionDto> {
  const response = await apiClient.post<ApiEnvelope<TransactionDto>>(
    '/transfers',
    {
      fromWalletId,
      to,
      amount,
    },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return response.data.data;
}


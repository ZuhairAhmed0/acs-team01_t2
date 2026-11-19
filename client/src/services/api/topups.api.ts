import { apiClient } from '../../lib/axios.js';
import type { ApiEnvelope, TransactionDto } from '../../types/api.types.js';

export interface CreateTopupParams {
  amount: number;
  idempotencyKey: string;
}

/**
 * Initiates a simulated bank top-up into the user's `USER_MAIN` wallet.
 * Endpoint: `POST /api/topups` with mandatory `Idempotency-Key` header.
 */
export async function createTopupRequest({
  amount,
  idempotencyKey,
}: CreateTopupParams): Promise<TransactionDto> {
  const response = await apiClient.post<ApiEnvelope<TransactionDto>>(
    '/topups',
    { amount },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return response.data.data;
}


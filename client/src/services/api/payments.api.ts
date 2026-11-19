import { apiClient } from '../../lib/axios.js';
import type { ApiEnvelope, TransactionDto } from '../../types/api.types.js';

export interface CreatePaymentParams {
  stationId: string;
  sourceWalletId: string;
  amount: number;
  idempotencyKey: string;
}

/**
 * Executes an atomic fuel payment at a station (`USER_MAIN` or matching `USER_STATION` -> `STATION_REVENUE`).
 * Returns the transaction DTO including a 6-digit `verificationCode` for the station operator.
 * Endpoint: `POST /api/payments` with mandatory `Idempotency-Key` header.
 */
export async function createPaymentRequest({
  stationId,
  sourceWalletId,
  amount,
  idempotencyKey,
}: CreatePaymentParams): Promise<TransactionDto> {
  const response = await apiClient.post<ApiEnvelope<TransactionDto>>(
    '/payments',
    {
      stationId,
      sourceWalletId,
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


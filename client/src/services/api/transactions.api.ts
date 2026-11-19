import { apiClient } from '../../lib/axios.js';
import type {
  ApiEnvelope,
  PaginatedResponseDto,
  TransactionHistoryItemDto,
  TransactionStatus,
  TransactionType,
  WalletLedgerEntryDto,
} from '../../types/api.types.js';

export interface ListTransactionsParams {
  limit?: number;
  cursor?: string;
  type?: TransactionType;
  status?: TransactionStatus;
}

/**
 * Fetches cursor-paginated transaction history for the authenticated user.
 * Endpoint: `GET /api/transactions?limit=&cursor=&type=&status=`
 */
export async function fetchTransactions(
  params: ListTransactionsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponseDto<TransactionHistoryItemDto>> {
  const response = await apiClient.get<
    ApiEnvelope<PaginatedResponseDto<TransactionHistoryItemDto>>
  >('/transactions', {
    params,
    signal,
  });
  return response.data.data;
}

/**
 * Fetches a single transaction by UUID (owned by the caller).
 * Used both for viewing transaction details and for polling/reconciling `PENDING` transactions.
 * Endpoint: `GET /api/transactions/:id`
 */
export async function fetchTransactionById(
  id: string,
  signal?: AbortSignal,
): Promise<TransactionHistoryItemDto> {
  const response = await apiClient.get<ApiEnvelope<TransactionHistoryItemDto>>(
    `/transactions/${encodeURIComponent(id)}`,
    { signal },
  );
  return response.data.data;
}

/**
 * Fetches the cursor-paginated double-entry ledger statement for a user-owned wallet.
 * Endpoint: `GET /api/wallets/:id/ledger?limit=&cursor=`
 */
export async function fetchWalletLedger(
  walletId: string,
  params: { limit?: number; cursor?: string } = {},
  signal?: AbortSignal,
): Promise<PaginatedResponseDto<WalletLedgerEntryDto>> {
  const response = await apiClient.get<
    ApiEnvelope<PaginatedResponseDto<WalletLedgerEntryDto>>
  >(`/wallets/${encodeURIComponent(walletId)}/ledger`, {
    params,
    signal,
  });
  return response.data.data;
}


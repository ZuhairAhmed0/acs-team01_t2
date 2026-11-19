import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  fetchTransactionById,
  fetchTransactions,
  type ListTransactionsParams,
} from '../../../services/api/transactions.api.js';

export function useTransactionsQuery(params: ListTransactionsParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: ({ signal }) => fetchTransactions(params, signal),
  });
}

/**
 * Fetches a single transaction by UUID (`GET /api/transactions/:id`).
 * Automatically polls every 3 seconds if the transaction is still in `PENDING` state.
 */
export function useTransactionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transactionDetail(id ?? ''),
    queryFn: ({ signal }) => fetchTransactionById(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 3_000 : false,
  });
}


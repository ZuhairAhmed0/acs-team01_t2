import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  createTopupRequest,
  type CreateTopupParams,
} from '../../../services/api/topups.api.js';
import { fetchWalletLedger } from '../../../services/api/transactions.api.js';

/**
 * React Query Mutation for Wallet Top-Up (`POST /api/topups`).
 *
 * When a top-up completes (or even if it fails with `503 BANK_UNAVAILABLE` which writes a `FAILED`
 * transaction row), we invalidate `['me']`, `['stations']`, `['transactions']`, and `['walletLedger']`
 * so the UI immediately reflects the authoritative backend balances and transaction history.
 */
export function useTopupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTopupParams) => createTopupRequest(params),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['walletLedger'] });
    },
  });
}

/**
 * Fetches the double-entry ledger statement for a specific wallet (`GET /api/wallets/:id/ledger`).
 */
export function useWalletLedgerQuery(walletId: string | null, cursor?: string) {
  return useQuery({
    queryKey: queryKeys.walletLedger(walletId ?? '', cursor),
    queryFn: ({ signal }) =>
      fetchWalletLedger(walletId!, { limit: 20, cursor }, signal),
    enabled: Boolean(walletId),
  });
}


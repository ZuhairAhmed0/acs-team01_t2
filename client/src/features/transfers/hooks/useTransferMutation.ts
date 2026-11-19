import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  createTransferRequest,
  type CreateTransferParams,
} from '../../../services/api/transfers.api.js';

/**
 * React Query Mutation for Wallet-to-Wallet Transfers (`POST /api/transfers`).
 * Invalidates `['me']`, `['stations']`, `['transactions']`, and `['walletLedger']`.
 */
export function useTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTransferParams) => createTransferRequest(params),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['walletLedger'] });
    },
  });
}


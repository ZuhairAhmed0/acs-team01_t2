import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  createPaymentRequest,
  type CreatePaymentParams,
} from '../../../services/api/payments.api.js';

/**
 * React Query Mutation for Station Fuel Payments (`POST /api/payments`).
 * Invalidates all wallet, station, transaction, and operator caches on completion.
 */
export function usePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreatePaymentParams) => createPaymentRequest(params),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['walletLedger'] });
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
    },
  });
}


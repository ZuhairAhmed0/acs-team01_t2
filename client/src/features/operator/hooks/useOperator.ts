import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  assignOperatorStationRequest,
  fetchOperatorPayments,
  fetchOperatorSummary,
  lookupOperatorPaymentCode,
  updateOperatorStationCongestion,
} from '../../../services/api/operator.api.js';
import type { CongestionLevel } from '../../../types/api.types.js';

export function useOperatorSummaryQuery(stationId?: string) {
  return useQuery({
    queryKey: queryKeys.operatorSummary(stationId),
    queryFn: ({ signal }) => fetchOperatorSummary(stationId, signal),
  });
}

export function useOperatorPaymentsQuery(stationId?: string, cursor?: string) {
  return useQuery({
    queryKey: queryKeys.operatorPayments(stationId, cursor),
    queryFn: ({ signal }) =>
      fetchOperatorPayments({ limit: 20, cursor, stationId }, signal),
  });
}

export function useLookupPaymentCodeMutation() {
  return useMutation({
    mutationFn: ({ code, stationId }: { code: string; stationId?: string }) =>
      lookupOperatorPaymentCode(code, stationId),
  });
}

export function useUpdateCongestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      congestion,
      stationId,
    }: {
      congestion: CongestionLevel;
      stationId?: string;
    }) => updateOperatorStationCongestion(congestion, stationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}

export function useAssignOperatorStationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationId: string) => assignOperatorStationRequest(stationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}


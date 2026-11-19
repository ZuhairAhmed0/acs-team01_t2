import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  fetchAdminBankStatus,
  fetchAdminReconciliation,
  updateAdminBankStatus,
  updateAdminStationActive,
  updateAdminUserStatus,
} from '../../../services/api/admin.api.js';
import type { BankGatewayStatus, UserStatus } from '../../../types/api.types.js';

export function useAdminBankStatusQuery() {
  return useQuery({
    queryKey: queryKeys.adminBankStatus,
    queryFn: ({ signal }) => fetchAdminBankStatus(signal),
  });
}

export function useUpdateBankStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: BankGatewayStatus) => updateAdminBankStatus(status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBankStatus });
    },
  });
}

export function useAdminReconcileQuery() {
  return useQuery({
    queryKey: queryKeys.adminReconcile,
    queryFn: ({ signal }) => fetchAdminReconciliation(signal),
  });
}

export function useToggleStationActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stationId,
      isActive,
    }: {
      stationId: string;
      isActive: boolean;
    }) => updateAdminStationActive(stationId, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      updateAdminUserStatus(userId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  createStationRequest,
  deleteStationRequest,
  fetchStationById,
  fetchStations,
  updateStationRequest,
} from '../../../services/api/stations.api.js';
import type {
  CreateStationInputDto,
  UpdateStationInputDto,
} from '../../../types/api.types.js';

export function useStationsQuery(city?: string) {
  return useQuery({
    queryKey: queryKeys.stations(city),
    queryFn: ({ signal }) => fetchStations(city, signal),
  });
}

export function useStationDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.stationDetail(id ?? ''),
    queryFn: ({ signal }) => fetchStationById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateStationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStationInputDto) =>
      createStationRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
    },
  });
}

export function useUpdateStationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateStationInputDto;
    }) => updateStationRequest(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
    },
  });
}

export function useDeleteStationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStationRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: ['operator'] });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

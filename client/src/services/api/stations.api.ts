import { apiClient } from '../../lib/axios.js';
import type {
  ApiEnvelope,
  CreateStationInputDto,
  StationDto,
  UpdateStationInputDto,
} from '../../types/api.types.js';

/**
 * Lists all stations (both active and inactive) along with the caller's
 * dedicated station wallet balance and total spendable balance at each station.
 * Endpoint: `GET /api/stations?city=`
 */
export async function fetchStations(
  city?: string,
  signal?: AbortSignal,
): Promise<StationDto[]> {
  const params = city && city.trim().length > 0 ? { city: city.trim() } : {};
  const response = await apiClient.get<ApiEnvelope<StationDto[]>>('/stations', {
    params,
    signal,
  });
  return response.data.data;
}

/**
 * Fetches details for a single station by UUID.
 * Endpoint: `GET /api/stations/:id`
 */
export async function fetchStationById(
  id: string,
  signal?: AbortSignal,
): Promise<StationDto> {
  const response = await apiClient.get<ApiEnvelope<StationDto>>(
    `/stations/${encodeURIComponent(id)}`,
    { signal },
  );
  return response.data.data;
}

/**
 * Creates a new fuel station along with its STATION_REVENUE wallet.
 * Endpoint: `POST /api/stations`
 */
export async function createStationRequest(
  payload: CreateStationInputDto,
): Promise<StationDto> {
  const response = await apiClient.post<ApiEnvelope<StationDto>>(
    '/stations',
    payload,
  );
  return response.data.data;
}

/**
 * Updates an existing fuel station's details (name, city, address, congestion, isActive).
 * Endpoint: `PATCH /api/stations/:id`
 */
export async function updateStationRequest(
  id: string,
  payload: UpdateStationInputDto,
): Promise<StationDto> {
  const response = await apiClient.patch<ApiEnvelope<StationDto>>(
    `/stations/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data.data;
}

/**
 * Deletes a fuel station by UUID.
 * Endpoint: `DELETE /api/stations/:id`
 */
export async function deleteStationRequest(
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  const response = await apiClient.delete<
    ApiEnvelope<{ id: string; deleted: boolean }>
  >(`/stations/${encodeURIComponent(id)}`);
  return response.data.data;
}

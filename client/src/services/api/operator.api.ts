import { apiClient } from '../../lib/axios.js';
import type {
  ApiEnvelope,
  CongestionLevel,
  OperatorPaymentDto,
  OperatorSummaryDto,
  PaginatedResponseDto,
  StationDto,
} from '../../types/api.types.js';

/**
 * Fetches today's total amount, payment count, and settlement balance for the operator's station.
 * Note: `ADMIN` callers may pass `stationId` to inspect any station.
 * Endpoint: `GET /api/operator/summary`
 */
export async function fetchOperatorSummary(
  stationId?: string,
  signal?: AbortSignal,
): Promise<OperatorSummaryDto> {
  const response = await apiClient.get<ApiEnvelope<OperatorSummaryDto>>(
    '/operator/summary',
    {
      params: stationId ? { stationId } : {},
      signal,
    },
  );
  return response.data.data;
}

/**
 * Fetches cursor-paginated COMPLETED payments into the station's revenue wallet.
 * Endpoint: `GET /api/operator/payments?limit=&cursor=&stationId=`
 */
export async function fetchOperatorPayments(
  params: { limit?: number; cursor?: string; stationId?: string } = {},
  signal?: AbortSignal,
): Promise<PaginatedResponseDto<OperatorPaymentDto>> {
  const response = await apiClient.get<
    ApiEnvelope<PaginatedResponseDto<OperatorPaymentDto>>
  >('/operator/payments', {
    params,
    signal,
  });
  return response.data.data;
}

/**
 * Looks up a COMPLETED payment at the operator's station created within the last 30 minutes
 * matching the 6-digit verification code. Rate limited to 20 req/min per operator.
 * Endpoint: `GET /api/operator/payments/lookup?code=123456`
 */
export async function lookupOperatorPaymentCode(
  code: string,
  stationId?: string,
  signal?: AbortSignal,
): Promise<OperatorPaymentDto> {
  const response = await apiClient.get<ApiEnvelope<OperatorPaymentDto>>(
    '/operator/payments/lookup',
    {
      params: {
        code: code.trim(),
        ...(stationId ? { stationId } : {}),
      },
      signal,
    },
  );
  return response.data.data;
}

/**
 * Updates the station's congestion level (`'LOW' | 'MEDIUM' | 'HIGH'`).
 * Endpoint: `PATCH /api/operator/station`
 */
export async function updateOperatorStationCongestion(
  congestion: CongestionLevel,
  stationId?: string,
): Promise<StationDto> {
  const response = await apiClient.patch<ApiEnvelope<StationDto>>(
    '/operator/station',
    {
      congestion,
      ...(stationId ? { stationId } : {}),
    },
  );
  return response.data.data;
}

/**
 * Assigns or switches the operator's active station (`users.operator_station_id`).
 * Endpoint: `PATCH /api/operator/assign-station`
 */
export async function assignOperatorStationRequest(
  stationId: string,
): Promise<{ operatorStationId: string; station: StationDto }> {
  const response = await apiClient.patch<
    ApiEnvelope<{ operatorStationId: string; station: StationDto }>
  >('/operator/assign-station', {
    stationId,
  });
  return response.data.data;
}


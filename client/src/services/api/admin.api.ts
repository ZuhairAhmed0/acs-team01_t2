import { apiClient } from '../../lib/axios.js';
import type {
  ApiEnvelope,
  BankGatewayStatus,
  ReconciliationReportDto,
  StationDto,
  UserStatus,
} from '../../types/api.types.js';

/**
 * Retrieves the current simulated bank gateway status (`'UP' | 'DOWN'`).
 * Endpoint: `GET /api/admin/bank-status` (Role: `ADMIN`)
 */
export async function fetchAdminBankStatus(
  signal?: AbortSignal,
): Promise<{ status: BankGatewayStatus }> {
  const response = await apiClient.get<
    ApiEnvelope<{ status: BankGatewayStatus }>
  >('/admin/bank-status', { signal });
  return response.data.data;
}

/**
 * Updates the simulated bank gateway status (`'UP' | 'DOWN'`).
 * Endpoint: `POST /api/admin/bank-status` (Role: `ADMIN`)
 */
export async function updateAdminBankStatus(
  status: BankGatewayStatus,
): Promise<{ status: BankGatewayStatus }> {
  const response = await apiClient.post<
    ApiEnvelope<{ status: BankGatewayStatus }>
  >('/admin/bank-status', { status });
  return response.data.data;
}

/**
 * Runs the system-wide double-entry ledger reconciliation check.
 * Endpoint: `GET /api/admin/reconcile` (Role: `ADMIN`)
 */
export async function fetchAdminReconciliation(
  signal?: AbortSignal,
): Promise<ReconciliationReportDto> {
  const response = await apiClient.get<ApiEnvelope<ReconciliationReportDto>>(
    '/admin/reconcile',
    { signal },
  );
  return response.data.data;
}

/**
 * Activates or deactivates a fuel station (`isActive: boolean`).
 * Endpoint: `PATCH /api/admin/stations/:id` (Role: `ADMIN`)
 */
export async function updateAdminStationActive(
  stationId: string,
  isActive: boolean,
): Promise<StationDto> {
  const response = await apiClient.patch<ApiEnvelope<StationDto>>(
    `/admin/stations/${encodeURIComponent(stationId)}`,
    { isActive },
  );
  return response.data.data;
}

/**
 * Freezes or activates a user account (`status: 'ACTIVE' | 'FROZEN'`).
 * Endpoint: `PATCH /api/admin/users/:id` (Role: `ADMIN`)
 */
export async function updateAdminUserStatus(
  userId: string,
  status: UserStatus,
): Promise<{ id: string; status: UserStatus }> {
  const response = await apiClient.patch<
    ApiEnvelope<{ id: string; status: UserStatus }>
  >(`/admin/users/${encodeURIComponent(userId)}`, { status });
  return response.data.data;
}


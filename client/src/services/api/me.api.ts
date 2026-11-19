import { apiClient } from '../../lib/axios.js';
import type { ApiEnvelope, MeResponseDto } from '../../types/api.types.js';

/**
 * Fetches the authenticated user's profile, role, status, main wallet,
 * dedicated station wallets, and total available balance from `GET /api/me`.
 */
export async function fetchMe(signal?: AbortSignal): Promise<MeResponseDto> {
  const response = await apiClient.get<ApiEnvelope<MeResponseDto>>('/me', {
    signal,
  });
  return response.data.data;
}


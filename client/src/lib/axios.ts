import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../app/config/env.js';
import type { ApiErrorEnvelope } from '../types/api.types.js';

/**
 * Centralized Axios HTTP Client & Clerk Session Token Bridge.
 *
 * React & API Concept Explanation  
 * Instead of calling `fetch()` manually in every component and repeating base URLs,
 * headers, and error parsing, we create one shared `apiClient` instance.
 *
 * Why `setAuthTokenGetter`?
 * Clerk manages session tokens inside a React hook (`useAuth().getToken`).
 * Because `axios.ts` is a plain TypeScript module outside the React component tree,
 * our `<AuthTokenSync />` component registers `getToken` here once when the app mounts.
 * Then, Axios's request interceptor automatically awaits a fresh Clerk JWT and attaches
 * `Authorization: Bearer <token>` to every outgoing backend request!
 */

type TokenGetter = () => Promise<string | null>;

let clerkTokenGetter: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter | null): void {
  clerkTokenGetter = getter;
}

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (clerkTokenGetter) {
      try {
        const token = await clerkTokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Proceed without token; backend requireApiAuth will return 401 JSON if protected.
      }
    }
    return config;
  },
);

/**
 * Extracts a human-readable error message and backend error code from any Axios or unknown error.
 * The backend always returns `{ error: { code, message, details? } }` with Arabic messages from `ERROR_CATALOG`.
 */
export interface ParsedApiError {
  code: string;
  message: string;
  httpStatus?: number;
}

export function extractApiError(
  err: unknown,
  fallbackMessage = 'حدث خطأ في الاتصال بالخادم',
): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorEnvelope>;
    const backendError = axiosErr.response?.data?.error;
    if (backendError?.message) {
      return {
        code: backendError.code || 'API_ERROR',
        message: backendError.message,
        httpStatus: axiosErr.response?.status,
      };
    }
    if (axiosErr.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message:
          'انتهت مهلة الاتصال بالخادم. يرجى التحقق من سجل العمليات قبل إعادة المحاولة.',
        httpStatus: 408,
      };
    }
  }

  if (err instanceof Error && err.message) {
    return {
      code: 'CLIENT_ERROR',
      message: err.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage,
  };
}


/**
 * Centralized Frontend Environment Configuration.
 *
 * In Vite, browser-safe environment variables must be prefixed with `VITE_`
 * and are accessed via `import.meta.env`.
 * Never place secret keys (like `CLERK_SECRET_KEY` or `DATABASE_URL`) in frontend `.env` files.
 */

const rawApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  '/api';

/**
 * When running in Vite development mode (`import.meta.env.DEV`), if `VITE_API_URL` points to
 * `http://localhost:3000/api`, we route through `/api` so Vite's dev proxy forwards requests
 * to `http://localhost:3000/api` as same-origin requests (avoiding browser CORS blocks).
 */
function resolveApiBaseUrl(configuredUrl: string): string {
  if (import.meta.env.DEV && /^https?:\/\/localhost:3000(\/api)?\/?$/i.test(configuredUrl)) {
    return '/api';
  }
  const cleanUrl = configuredUrl.replace(/\/+$/, '');
  if (!cleanUrl || cleanUrl === '') {
    return '/api';
  }
  if (!cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/api`;
  }
  return cleanUrl;
}

export const env = {
  CLERK_PUBLISHABLE_KEY:
    (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim() || '',
  API_BASE_URL: resolveApiBaseUrl(rawApiUrl),
  RAW_API_URL: rawApiUrl,
} as const;


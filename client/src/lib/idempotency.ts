/**
 * Idempotency Key Generator for Money-Moving POST Requests.
 *
 * Financial Concept Explanation:
 * Every money-moving POST endpoint (`/api/topups`, `/api/transfers`, `/api/payments`)
 * requires an `Idempotency-Key` header (8–64 characters).
 *
 * If a user taps "Pay" at a fuel station with weak mobile reception and the network
 * drops before the response arrives, retrying with the **same** `Idempotency-Key`
 * guarantees the backend returns the original transaction result instead of charging
 * the user twice!
 */
export function createIdempotencyKey(prefix = 'fw'): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `${prefix}-${uuid}`.slice(0, 64);
}


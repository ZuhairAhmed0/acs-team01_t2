import { useAuth } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys.js';
import { fetchMe } from '../../../services/api/me.api.js';

/**
 * Custom Hook: `useCurrentUser`
 *
 * React & Clerk Integration Explanation:
 * 1. `useAuth()` from `@clerk/clerk-react` tells us whether Clerk has finished loading
 *    (`isLoaded`) and whether the user has an active Clerk session (`isSignedIn`).
 * 2. Once `isLoaded && isSignedIn` is true, `useQuery` calls `GET /api/me`.
 * 3. On the backend, `ensureUser` middleware automatically creates/syncs the PostgreSQL
 *    `users` row and `USER_MAIN` wallet on the very first call, returning `{ user, wallets, totalBalance }`.
 */
export function useCurrentUser() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  const meQuery = useQuery({
    queryKey: [...queryKeys.me, userId ?? 'anon'],
    queryFn: ({ signal }) => fetchMe(signal),
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 10_000,
  });

  return {
    isClerkLoaded: isLoaded,
    isSignedIn: Boolean(isSignedIn),
    me: meQuery.data ?? null,
    user: meQuery.data?.user ?? null,
    wallets: meQuery.data?.wallets ?? null,
    totalBalance: meQuery.data?.totalBalance ?? 0,
    isLoading: !isLoaded || (Boolean(isSignedIn) && meQuery.isLoading),
    isError: meQuery.isError,
    error: meQuery.error,
    refetch: meQuery.refetch,
  };
}


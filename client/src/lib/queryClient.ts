import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized TanStack React Query Client.
 *
 * React Query Concept Explanation  
 * Instead of writing manual `useEffect` + `fetch` + `isLoading` + `error` state in every component,
 * React Query caches server responses by a structured "Query Key" (e.g. `['me']` or `['stations']`).
 * When a mutation (like a Top-Up, Payment, or Transfer) succeeds, we call
 * `queryClient.invalidateQueries(...)` and React Query automatically refetches all affected
 * balances and transaction lists in the background!
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});


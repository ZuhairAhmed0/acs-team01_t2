import { ClerkProvider, useAuth } from '@clerk/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { setAuthTokenGetter } from '../../lib/axios.js';
import { queryClient } from '../../lib/queryClient.js';
import { env } from '../config/env.js';
import { LanguageProvider } from './LanguageProvider.js';
import { ThemeProvider } from './ThemeProvider.js';

/**
 * Synchronizes Clerk's `getToken` function with our centralized Axios instance (`src/lib/axios.ts`).
 * Whenever Axios sends an HTTP request to `/api/*`, it invokes `getToken()` to attach
 * a valid `Authorization: Bearer <jwt>` header.
 */
function AuthTokenSync({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.clear();
    }
  }, [isSignedIn]);

  return <>{children}</>;
}

/**
 * Root Application Providers Hierarchy:
 * 1. `ThemeProvider`: Dark/Light mode CSS variables & `localStorage` persistence.
 * 2. `LanguageProvider`: Arabic (RTL) / English (LTR) localization & `<html dir>` sync.
 * 3. `ClerkProvider`: Authentication & session management.
 * 4. `QueryClientProvider`: TanStack React Query server-state cache.
 * 5. `BrowserRouter`: Client-side routing.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!env.CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-center">
          <h1 className="text-lg font-bold text-red-400">
            Missing Clerk Publishable Key
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Please configure <code>VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
            <code>client/.env</code> and restart the Vite server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ClerkProvider publishableKey={env.CLERK_PUBLISHABLE_KEY}>
          <QueryClientProvider client={queryClient}>
            <AuthTokenSync>
              <BrowserRouter>{children}</BrowserRouter>
            </AuthTokenSync>
          </QueryClientProvider>
        </ClerkProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


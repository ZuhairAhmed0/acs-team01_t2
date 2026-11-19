import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell.js';
import { ErrorState } from '../../components/shared/ErrorState.js';
import { LoadingState } from '../../components/shared/LoadingState.js';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser.js';
import { extractApiError } from '../../lib/axios.js';
import type { UserRole } from '../../types/api.types.js';

/**
 * Protected & Role-Based Route Guard.
 *
 * How it works:
 * 1. Waits for Clerk session restoration (`isClerkLoaded`).
 * 2. Redirects unauthenticated visitors to `/sign-in`.
 * 3. Fetches and synchronizes the user's database profile via `GET /api/me`.
 * 4. If `allowedRoles` is specified (e.g. `['OPERATOR', 'ADMIN']` or `['ADMIN']`),
 *    verifies the user's backend-issued `role`. Note that the backend also enforces
 *    `requireRole(...)` on every API request; this frontend check is for UX navigation.
 */
export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const {
    isClerkLoaded,
    isSignedIn,
    user,
    isLoading,
    isError,
    error,
    refetch,
  } = useCurrentUser();

  if (!isClerkLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <LoadingState />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (isError || !user) {
    const parsed = extractApiError(error);
    return (
      <AppShell>
        <ErrorState
          message={parsed.message}
          onRetry={() => {
            void refetch();
          }}
        />
      </AppShell>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <AppShell>
        <ErrorState
          title="403 — غير مصرح بالوصول / Access Restricted"
          message={`هذه الصفحة مخصصة للأدوار: ${allowedRoles.join(', ')}. دورك الحالي: ${user.role}`}
        />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}


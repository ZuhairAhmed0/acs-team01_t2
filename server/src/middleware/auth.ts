import { getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { ERROR_CATALOG } from '../errors/catalog.js';

/**
 * Middleware that verifies a valid Clerk session exists on API requests.
 * Uses `getAuth(req)` (never `requireAuth()`, which redirects).
 * Responds with 401 JSON `{ error: { code: 'UNAUTHENTICATED', message } }` if unauthenticated.
 */
export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  let userId: string | null = null;
  try {
    const auth = getAuth(req);
    userId = auth.userId;
  } catch {
    userId = null;
  }

  if (!userId) {
    res.status(ERROR_CATALOG.UNAUTHENTICATED.httpStatus).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: ERROR_CATALOG.UNAUTHENTICATED.message,
      },
    });
    return;
  }

  next();
}

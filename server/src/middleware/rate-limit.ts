import { rateLimit } from 'express-rate-limit';
import { ERROR_CATALOG } from '../errors/catalog.js';

/**
 * Global API rate limiter middleware (300 req/min per IP).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: ERROR_CATALOG.TOO_MANY_REQUESTS.message,
    },
  },
});

/**
 * Per-user rate limiter for money-moving POST endpoints (30 req/min keyed by `req.user.id`).
 */
export const perUserRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: ERROR_CATALOG.TOO_MANY_REQUESTS.message,
    },
  },
});

/**
 * Per-operator rate limiter for payment verification code lookups (20 req/min keyed by `req.user.id`)
 * to prevent brute-force code guessing.
 */
export const operatorLookupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: ERROR_CATALOG.TOO_MANY_REQUESTS.message,
    },
  },
});

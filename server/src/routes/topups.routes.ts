import { Router } from 'express';
import { createTopup } from '../controllers/topups.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { perUserRateLimiter } from '../middleware/rate-limit.js';
import { requireIdempotencyKey } from '../middleware/require-idempotency-key.js';
import { validate } from '../middleware/validate.js';
import { createTopupSchema } from '../schemas/topup.js';

export const topupsRouter = Router();

topupsRouter.post(
  '/',
  requireApiAuth,
  ensureUser,
  requireIdempotencyKey,
  perUserRateLimiter,
  validate({ body: createTopupSchema }),
  createTopup,
);

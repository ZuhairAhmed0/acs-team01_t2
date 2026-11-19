import { Router } from 'express';
import { createTransfer } from '../controllers/transfers.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { perUserRateLimiter } from '../middleware/rate-limit.js';
import { requireIdempotencyKey } from '../middleware/require-idempotency-key.js';
import { validate } from '../middleware/validate.js';
import { createTransferSchema } from '../schemas/transfer.js';

export const transfersRouter = Router();

transfersRouter.post(
  '/',
  requireApiAuth,
  ensureUser,
  requireIdempotencyKey,
  perUserRateLimiter,
  validate({ body: createTransferSchema }),
  createTransfer,
);

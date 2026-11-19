import { Router } from 'express';
import { createPayment } from '../controllers/payments.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { perUserRateLimiter } from '../middleware/rate-limit.js';
import { requireIdempotencyKey } from '../middleware/require-idempotency-key.js';
import { validate } from '../middleware/validate.js';
import { createPaymentSchema } from '../schemas/payment.js';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/',
  requireApiAuth,
  ensureUser,
  requireIdempotencyKey,
  perUserRateLimiter,
  validate({ body: createPaymentSchema }),
  createPayment,
);

import { Router } from 'express';
import {
  assignOperatorStation,
  getOperatorSummary,
  listOperatorPayments,
  lookupOperatorPayment,
  updateStationCongestion,
} from '../controllers/operator.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { operatorLookupRateLimiter } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import {
  assignOperatorStationSchema,
  operatorLookupQuerySchema,
  operatorPaymentsQuerySchema,
  operatorStationQuerySchema,
  updateStationCongestionSchema,
} from '../schemas/operator.js';

export const operatorRouter = Router();

operatorRouter.use(
  requireApiAuth,
  ensureUser,
  requireRole('OPERATOR', 'ADMIN'),
);

operatorRouter.patch(
  '/assign-station',
  validate({ body: assignOperatorStationSchema }),
  assignOperatorStation,
);

operatorRouter.get(
  '/payments',
  validate({ query: operatorPaymentsQuerySchema }),
  listOperatorPayments,
);

operatorRouter.get(
  '/payments/lookup',
  operatorLookupRateLimiter,
  validate({ query: operatorLookupQuerySchema }),
  lookupOperatorPayment,
);

operatorRouter.patch(
  '/station',
  validate({
    query: operatorStationQuerySchema,
    body: updateStationCongestionSchema,
  }),
  updateStationCongestion,
);

operatorRouter.patch(
  '/congestion',
  validate({
    query: operatorStationQuerySchema,
    body: updateStationCongestionSchema,
  }),
  updateStationCongestion,
);

operatorRouter.get(
  '/summary',
  validate({ query: operatorStationQuerySchema }),
  getOperatorSummary,
);

operatorRouter.get(
  '/dashboard',
  validate({ query: operatorStationQuerySchema }),
  getOperatorSummary,
);

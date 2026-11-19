import { Router } from 'express';
import {
  createAdminStation,
  deleteAdminStation,
  getAdminOverview,
  getBankGatewayStatus,
  patchAdminStation,
  patchAdminUser,
  runReconciliation,
  updateBankGatewayStatus,
} from '../controllers/admin.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import {
  createAdminStationSchema,
  patchAdminStationSchema,
  patchAdminUserSchema,
} from '../schemas/admin.js';
import { updateBankStatusSchema } from '../schemas/topup.js';
import { uuidParamSchema } from '../schemas/transaction.js';

export const adminRouter = Router();

adminRouter.use(requireApiAuth, ensureUser, requireRole('ADMIN'));
adminRouter.get('/overview', getAdminOverview);
adminRouter.get('/bank-status', getBankGatewayStatus);
adminRouter.post(
  '/bank-status',
  validate({ body: updateBankStatusSchema }),
  updateBankGatewayStatus,
);
adminRouter.get('/reconcile', runReconciliation);
adminRouter.post('/reconcile', runReconciliation);
adminRouter.post(
  '/stations',
  validate({ body: createAdminStationSchema }),
  createAdminStation,
);
adminRouter.patch(
  '/stations/:id',
  validate({ params: uuidParamSchema, body: patchAdminStationSchema }),
  patchAdminStation,
);
adminRouter.delete(
  '/stations/:id',
  validate({ params: uuidParamSchema }),
  deleteAdminStation,
);
adminRouter.patch(
  '/users/:id',
  validate({ params: uuidParamSchema, body: patchAdminUserSchema }),
  patchAdminUser,
);

import { Router } from 'express';
import { getWalletLedger } from '../controllers/transactions.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { validate } from '../middleware/validate.js';
import {
  uuidParamSchema,
  walletLedgerQuerySchema,
} from '../schemas/transaction.js';

export const walletsRouter = Router();

walletsRouter.use(requireApiAuth, ensureUser);
walletsRouter.get(
  '/:id/ledger',
  validate({ params: uuidParamSchema, query: walletLedgerQuerySchema }),
  getWalletLedger,
);


import { Router } from 'express';
import {
  getTransactionById,
  listTransactions,
} from '../controllers/transactions.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { validate } from '../middleware/validate.js';
import {
  listTransactionsQuerySchema,
  uuidParamSchema,
} from '../schemas/transaction.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireApiAuth, ensureUser);
transactionsRouter.get(
  '/',
  validate({ query: listTransactionsQuerySchema }),
  listTransactions,
);
transactionsRouter.get(
  '/:id',
  validate({ params: uuidParamSchema }),
  getTransactionById,
);

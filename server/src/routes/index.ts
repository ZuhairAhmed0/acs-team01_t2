import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { meRouter } from './me.routes.js';
import { operatorRouter } from './operator.routes.js';
import { paymentsRouter } from './payments.routes.js';
import { stationsRouter } from './stations.routes.js';
import { topupsRouter } from './topups.routes.js';
import { transactionsRouter } from './transactions.routes.js';
import { transfersRouter } from './transfers.routes.js';
import { walletsRouter } from './wallets.routes.js';

export const apiRouter = Router();

apiRouter.use('/me', meRouter);
apiRouter.use('/stations', stationsRouter);
apiRouter.use('/topups', topupsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/wallets', walletsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/operator', operatorRouter);

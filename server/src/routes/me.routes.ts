import { Router } from 'express';
import { getMe } from '../controllers/me.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';

export const meRouter = Router();

meRouter.use(requireApiAuth, ensureUser);
meRouter.get('/', getMe);
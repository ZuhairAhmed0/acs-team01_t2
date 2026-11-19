import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { topupService } from '../services/topup.service.js';

/**
 * Initiates a wallet top-up transaction (`BANK_SIM -> USER_MAIN`).
 * Endpoint: POST /api/topups
 */
export async function createTopup(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  if (!req.idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED');
  }

  const { amount } = req.body as { amount: number };

  const { dto, replayed } = await topupService.executeWithMeta(
    req.user,
    { amount },
    req.idempotencyKey,
  );

  if (replayed) {
    res.set('Idempotent-Replayed', 'true');
    res.status(200).json({ data: dto });
    return;
  }

  res.status(201).json({ data: dto });
}

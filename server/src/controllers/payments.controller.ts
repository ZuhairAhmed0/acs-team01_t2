import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { paymentService } from '../services/payment.service.js';

/**
 * Initiates a fuel station payment transaction (`USER_STATION` or `USER_MAIN` -> `STATION_REVENUE`).
 * Endpoint: POST /api/payments
 */
export async function createPayment(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  if (!req.idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED');
  }

  const { stationId, sourceWalletId, amount } = req.body as {
    stationId: string;
    sourceWalletId: string;
    amount: number;
  };

  const { dto, replayed } = await paymentService.executeWithMeta(
    req.user,
    { stationId, sourceWalletId, amount },
    req.idempotencyKey,
  );

  if (replayed) {
    res.set('Idempotent-Replayed', 'true');
    res.status(200).json({ data: dto });
    return;
  }

  res.status(201).json({ data: dto });
}

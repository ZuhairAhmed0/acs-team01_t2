import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import type { TransferDestination } from '../schemas/transfer.js';
import { transferService } from '../services/transfer.service.js';

/**
 * Transfers balance between the authenticated user's wallets (`USER_MAIN` and `USER_STATION`).
 * Endpoint: POST /api/transfers
 */
export async function createTransfer(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  if (!req.idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED');
  }

  const { fromWalletId, to, amount } = req.body as {
    fromWalletId: string;
    to: TransferDestination;
    amount: number;
  };

  const { dto, replayed } = await transferService.executeWithMeta(
    req.user,
    { fromWalletId, to, amount },
    req.idempotencyKey,
  );

  if (replayed) {
    res.set('Idempotent-Replayed', 'true');
    res.status(200).json({ data: dto });
    return;
  }

  res.status(201).json({ data: dto });
}

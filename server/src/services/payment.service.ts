import { randomInt } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  TransactionType,
  UserStatus,
  WalletType,
} from '../generated/prisma/client.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { parseAmountToBigInt } from '../schemas/money.js';
import {
  type ResolvedTransaction,
  TransactionService,
} from './transaction.service.js';

export interface PaymentInput {
  stationId: string;
  sourceWalletId: string;
  amount: number | bigint;
}

/**
 * Station payment transaction service (`USER_STATION` or `USER_MAIN` -> `STATION_REVENUE`).
 */
export class PaymentService extends TransactionService<PaymentInput> {
  override type(): TransactionType {
    return TransactionType.PAYMENT;
  }

  /**
   * Resolves source user wallet and destination station revenue wallet:
   * - User must be `ACTIVE` (`ACCOUNT_FROZEN` 403 otherwise).
   * - Station must exist (`NOT_FOUND` 404) and be active (`STATION_INACTIVE` 422).
   * - `source` must be owned by the user and of type `USER_MAIN` or `USER_STATION` (`NOT_FOUND` 404 otherwise).
   * - If `source` is `USER_STATION`, its `stationId` must equal `input.stationId`, else `WRONG_STATION_BALANCE` (422).
   * - `destination` is the `STATION_REVENUE` wallet of `input.stationId`.
   * - Generates a 6-digit zero-padded `verificationCode` stored on `complete()`.
   */
  override async resolve(
    userId: string,
    input: PaymentInput,
  ): Promise<ResolvedTransaction> {
    const amount =
      typeof input.amount === 'bigint'
        ? input.amount
        : parseAmountToBigInt(input.amount);

    if (amount <= 0n) {
      throw new AppError('INVALID_AMOUNT');
    }

    const [user, station, sourceWallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      }),
      prisma.station.findUnique({
        where: { id: input.stationId },
        select: { id: true, isActive: true },
      }),
      walletRepository.getOwnedWallet(userId, input.sourceWalletId),
    ]);

    if (!user) {
      throw new AppError('NOT_FOUND');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('ACCOUNT_FROZEN');
    }

    if (!station) {
      throw new AppError('NOT_FOUND');
    }

    if (!station.isActive) {
      throw new AppError('STATION_INACTIVE');
    }

    if (
      !sourceWallet ||
      (sourceWallet.type !== WalletType.USER_MAIN &&
        sourceWallet.type !== WalletType.USER_STATION)
    ) {
      throw new AppError('NOT_FOUND');
    }

    if (
      sourceWallet.type === WalletType.USER_STATION &&
      sourceWallet.stationId !== station.id
    ) {
      throw new AppError('WRONG_STATION_BALANCE');
    }

    const revenueWallet = await walletRepository.getRevenueWallet(station.id);
    const verificationCode = String(randomInt(0, 1_000_000)).padStart(6, '0');

    return {
      fromWalletId: sourceWallet.id,
      toWalletId: revenueWallet.id,
      amount,
      verificationCode,
    };
  }
}

export const paymentService = new PaymentService();

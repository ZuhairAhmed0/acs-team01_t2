import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  TransactionType,
  UserStatus,
  WalletType,
} from '../generated/prisma/client.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { parseAmountToBigInt } from '../schemas/money.js';
import type { TransferDestination } from '../schemas/transfer.js';
import {
  type ResolvedTransaction,
  TransactionService,
} from './transaction.service.js';

export interface TransferInput {
  fromWalletId: string;
  to: TransferDestination;
  amount: number | bigint;
}

/**
 * Inter-station and main-wallet balance transfer service (`USER_MAIN` <-> `USER_STATION` or `USER_STATION` <-> `USER_STATION`).
 */
export class TransferService extends TransactionService<TransferInput> {
  override type(): TransactionType {
    return TransactionType.TRANSFER;
  }

  /**
   * Resolves source and destination user wallets according to transfer rules:
   * - User must be `ACTIVE` (`ACCOUNT_FROZEN` 403 otherwise).
   * - `source` = `getOwnedWallet(userId, fromWalletId)`, must be `USER_MAIN` or `USER_STATION`; else `NOT_FOUND` (404).
   *   (Source station may be inactive; taking money out is always allowed.)
   * - `destination` `MAIN` -> user's `USER_MAIN` wallet.
   * - `destination` `STATION` -> station must exist (`NOT_FOUND` 404) and be active (`STATION_INACTIVE` 422), then `ensureStationWallet`.
   * - `source.id === destination.id` -> `SAME_WALLET` (400).
   * - Never pre-checks wallet balance (the guarded `UPDATE` in `LedgerService.move` decides).
   */
  override async resolve(
    userId: string,
    input: TransferInput,
  ): Promise<ResolvedTransaction> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new AppError('NOT_FOUND');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('ACCOUNT_FROZEN');
    }

    const amount =
      typeof input.amount === 'bigint'
        ? input.amount
        : parseAmountToBigInt(input.amount);

    if (amount <= 0n) {
      throw new AppError('INVALID_AMOUNT');
    }

    const sourceWallet = await walletRepository.getOwnedWallet(
      userId,
      input.fromWalletId,
    );

    if (
      !sourceWallet ||
      (sourceWallet.type !== WalletType.USER_MAIN &&
        sourceWallet.type !== WalletType.USER_STATION)
    ) {
      throw new AppError('NOT_FOUND');
    }

    let destinationWalletId: string;

    if (input.to.type === 'MAIN') {
      const mainWallet = await walletRepository.getMainWallet(userId);
      destinationWalletId = mainWallet.id;
    } else {
      const station = await prisma.station.findUnique({
        where: { id: input.to.stationId },
        select: { id: true, isActive: true },
      });

      if (!station) {
        throw new AppError('NOT_FOUND');
      }

      if (!station.isActive) {
        throw new AppError('STATION_INACTIVE');
      }

      const stationWallet = await walletRepository.ensureStationWallet(
        userId,
        station.id,
      );
      destinationWalletId = stationWallet.id;
    }

    if (sourceWallet.id === destinationWalletId) {
      throw new AppError('SAME_WALLET');
    }

    return {
      fromWalletId: sourceWallet.id,
      toWalletId: destinationWalletId,
      amount,
    };
  }
}

export const transferService = new TransferService();

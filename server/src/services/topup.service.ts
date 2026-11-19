import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  type Transaction,
  TransactionType,
  UserStatus,
} from '../generated/prisma/client.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { parseAmountToBigInt } from '../schemas/money.js';
import { bankSimulatorService } from './bank-simulator.service.js';
import {
  type ResolvedTransaction,
  TransactionService,
} from './transaction.service.js';

export interface TopupInput {
  amount: number | bigint;
}

/**
 * Top-up transaction service (`BANK_SIM` -> `USER_MAIN`).
 */
export class TopupService extends TransactionService<TopupInput> {
  override type(): TransactionType {
    return TransactionType.TOPUP;
  }

  /**
   * Validates that the user is `ACTIVE` and that `amount` is within `[TOPUP_MIN, TOPUP_MAX]`,
   * then resolves `from = BANK_SIM` and `to = USER_MAIN`.
   * Throws before `begin()` so validation errors create no transaction row.
   */
  override async resolve(
    userId: string,
    input: TopupInput,
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

    const minAmount = BigInt(env.TOPUP_MIN);
    const maxAmount = BigInt(env.TOPUP_MAX);

    if (amount < minAmount || amount > maxAmount) {
      throw new AppError('AMOUNT_OUT_OF_RANGE');
    }

    const [bankWallet, mainWallet] = await Promise.all([
      walletRepository.getBankWallet(),
      walletRepository.getMainWallet(userId),
    ]);

    return {
      fromWalletId: bankWallet.id,
      toWalletId: mainWallet.id,
      amount,
    };
  }

  /**
   * Charges the simulated bank gateway after the PENDING transaction row is created.
   */
  override async externalStep(
    txn: Transaction,
    _input: TopupInput,
  ): Promise<void> {
    await bankSimulatorService.charge(txn.userId, txn.amount);
  }
}

export const topupService = new TopupService();

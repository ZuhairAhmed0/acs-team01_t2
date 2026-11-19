import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { ERROR_CATALOG } from '../errors/catalog.js';
import type {
  Transaction,
  TransactionType,
  UserRole,
  UserStatus,
} from '../generated/prisma/client.js';
import {
  isReplayedDto,
  type TransactionDto,
  transactionRepository,
} from '../repositories/transaction.repository.js';
import { requestHash } from '../utils/hash.js';
import { logger } from '../utils/logger.js';
import { ledgerService } from './ledger.service.js';

export interface ResolvedTransaction {
  fromWalletId: string;
  toWalletId: string;
  amount: bigint;
  verificationCode?: string;
}

export type TransactionCaller =
  | string
  | {
    id: string;
    role?: UserRole;
    status?: UserStatus;
  };


export abstract class TransactionService<TInput = unknown> {
  abstract type(): TransactionType;

  abstract resolve(
    userId: string,
    input: TInput,
  ): Promise<ResolvedTransaction>;


  async externalStep(_txn: Transaction, _input: TInput): Promise<void> {
    // Default no-op; overridden by services with external gateway interactions (e.g. TopupService)
  }


  async execute(
    user: TransactionCaller,
    dto: TInput,
    key: string,
  ): Promise<TransactionDto> {
    const userId = typeof user === 'string' ? user : user.id;
    const txnType = this.type();

    if (typeof user === 'object' && user.status === 'FROZEN') {
      throw new AppError('ACCOUNT_FROZEN');
    }

    const existing = await transactionRepository.findByKey(userId, key);

    // Resolve and validate preconditions (throws before `begin` so validation errors create NO txn row)
    const resolved = await this.resolve(userId, dto);

    if (resolved.amount <= 0n) {
      throw new AppError('INVALID_AMOUNT');
    }

    if (resolved.fromWalletId === resolved.toWalletId) {
      throw new AppError('SAME_WALLET');
    }

    const hash = requestHash({
      type: txnType,
      fromWalletId: resolved.fromWalletId,
      toWalletId: resolved.toWalletId,
      amount: resolved.amount,
    });

    if (existing) {
      logger.info('TransactionService', `Idempotent replay for ${txnType}`, {
        type: txnType,
        txnId: existing.id,
        userId,
        idempotencyKey: key,
        status: existing.status,
      });
      return transactionRepository.replay(existing, hash);
    }

    const { txn, isNew } = await transactionRepository.begin({
      type: txnType,
      userId,
      fromWalletId: resolved.fromWalletId,
      toWalletId: resolved.toWalletId,
      amount: resolved.amount,
      idempotencyKey: key,
      requestHash: hash,
    });

    if (!isNew) {
      logger.info('TransactionService', `Concurrent idempotent replay for ${txnType}`, {
        type: txnType,
        txnId: txn.id,
        userId,
        idempotencyKey: key,
        status: txn.status,
      });
      return transactionRepository.replay(txn, hash);
    }

    logger.info('TransactionService', `Began PENDING ${txnType} transaction`, {
      type: txnType,
      txnId: txn.id,
      userId,
      fromWalletId: resolved.fromWalletId,
      toWalletId: resolved.toWalletId,
      amount: resolved.amount,
      idempotencyKey: key,
    });

    try {
      await this.externalStep(txn, dto);

      const completed = await prisma.$transaction(
        async (tx) => {
          await ledgerService.move(
            tx,
            txn.id,
            resolved.fromWalletId,
            resolved.toWalletId,
            resolved.amount,
          );

          return transactionRepository.complete(
            tx,
            txn.id,
            resolved.verificationCode,
          );
        },
        {
          maxWait: 60_000,
          timeout: 60_000,
        },
      );

      const completedDto = transactionRepository.toDto(completed);
      logger.info('TransactionService', `Completed ${txnType} transaction`, {
        type: txnType,
        txnId: completedDto.id,
        reference: completedDto.reference,
        userId,
        amount: completedDto.amount,
        fromBalanceAfter: completedDto.fromBalanceAfter,
        toBalanceAfter: completedDto.toBalanceAfter,
      });

      return completedDto;
    } catch (err) {
      const code = err instanceof AppError ? String(err.code) : 'INTERNAL';
      const reason =
        err instanceof Error ? err.message : ERROR_CATALOG.INTERNAL.message;
      await transactionRepository.fail(txn.id, code, reason);

      logger.warn('TransactionService', `Failed ${txnType} transaction (${code})`, {
        type: txnType,
        txnId: txn.id,
        userId,
        amount: resolved.amount,
        failureCode: code,
        reason,
      });

      throw err;
    }
  }

  /**
   * Executes the transaction and returns both the DTO and whether it was an idempotent replay.
   */
  async executeWithMeta(
    user: TransactionCaller,
    dto: TInput,
    key: string,
  ): Promise<{ dto: TransactionDto; replayed: boolean }> {
    const resultDto = await this.execute(user, dto, key);
    return {
      dto: resultDto,
      replayed: isReplayedDto(resultDto),
    };
  }
}

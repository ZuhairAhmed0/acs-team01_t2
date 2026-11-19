import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  type LedgerEntry,
  type Prisma,
  type Transaction,
  TransactionStatus,
  type TransactionType,
} from '../generated/prisma/client.js';
import { formatTxReference } from '../utils/tx-reference.js';

export type TransactionWithLedger = Transaction & {
  ledgerEntries: LedgerEntry[];
};

export interface BeginTransactionInput {
  type: TransactionType;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: bigint;
  idempotencyKey: string;
  requestHash: string;
}

export interface TransactionDto {
  id: string;
  seq: number;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  idempotencyKey: string;
  failureCode: string | null;
  failureReason: string | null;
  verificationCode: string | null;
  balanceAfter: {
    from: number | null;
    to: number | null;
  };
  fromBalanceAfter: number | null;
  toBalanceAfter: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface RawTransactionRow {
  id: string;
  seq: number;
  type: TransactionType;
  status: TransactionStatus;
  user_id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: bigint;
  idempotency_key: string;
  request_hash: string;
  failure_code: string | null;
  failure_reason: string | null;
  verification_code: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function mapRawRowToTransaction(row: RawTransactionRow): TransactionWithLedger {
  return {
    id: row.id,
    seq: Number(row.seq),
    type: row.type,
    status: row.status,
    userId: row.user_id,
    fromWalletId: row.from_wallet_id,
    toWalletId: row.to_wallet_id,
    amount: BigInt(row.amount),
    idempotencyKey: row.idempotency_key,
    requestHash: row.request_hash.trim(),
    failureCode: row.failure_code,
    failureReason: row.failure_reason,
    verificationCode: row.verification_code ? row.verification_code.trim() : null,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    ledgerEntries: [],
  };
}

export const REPLAYED_SYMBOL = Symbol.for('fuel-wallet.replayed');

export function isReplayedDto(dto: TransactionDto): boolean {
  return Boolean((dto as unknown as Record<symbol, boolean>)[REPLAYED_SYMBOL]);
}

/**
 * Repository for transaction persistence, idempotency handling, and DTO projection.
 */
export class TransactionRepository {
  /**
   * Finds an existing transaction by `(userId, key)` including its `ledgerEntries`.
   */
  async findByKey(
    userId: string,
    key: string,
  ): Promise<TransactionWithLedger | null> {
    return prisma.transaction.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey: key,
        },
      },
      include: {
        ledgerEntries: true,
      },
    });
  }

  /**
   * Finds a transaction by ID including its `ledgerEntries`.
   */
  async get(id: string): Promise<TransactionWithLedger | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
      },
    });
  }

  /**
   * Atomically inserts a PENDING transaction row with raw SQL:
   * `INSERT ... ON CONFLICT (user_id, idempotency_key) DO NOTHING RETURNING *`.
   * On conflict (0 rows returned), re-reads the existing row and returns `{ txn, isNew: false }`.
   */
  async begin(
    input: BeginTransactionInput,
  ): Promise<{ txn: TransactionWithLedger; isNew: boolean }> {
    const inserted = await prisma.$queryRaw<RawTransactionRow[]>`
      INSERT INTO "transactions" (
        "type",
        "status",
        "user_id",
        "from_wallet_id",
        "to_wallet_id",
        "amount",
        "idempotency_key",
        "request_hash"
      )
      VALUES (
        ${input.type}::"TransactionType",
        'PENDING'::"TransactionStatus",
        ${input.userId}::uuid,
        ${input.fromWalletId}::uuid,
        ${input.toWalletId}::uuid,
        ${input.amount},
        ${input.idempotencyKey},
        ${input.requestHash}
      )
      ON CONFLICT ("user_id", "idempotency_key") DO NOTHING
      RETURNING *
    `;

    if (inserted.length > 0) {
      return {
        txn: mapRawRowToTransaction(inserted[0]!),
        isNew: true,
      };
    }

    const existing = await this.findByKey(input.userId, input.idempotencyKey);
    if (!existing) {
      throw new AppError('INTERNAL');
    }

    return {
      txn: existing,
      isNew: false,
    };
  }


  async complete(
    tx: Prisma.TransactionClient,
    id: string,
    verificationCode?: string,
  ): Promise<TransactionWithLedger> {
    const updated = await tx.transaction.updateMany({
      where: {
        id,
        status: TransactionStatus.PENDING,
      },
      data: {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
        ...(verificationCode !== undefined ? { verificationCode } : {}),
      },
    });

    if (updated.count === 0) {
      throw new AppError('TXN_NOT_PENDING');
    }

    const completed = await tx.transaction.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
      },
    });

    if (!completed) {
      throw new AppError('INTERNAL');
    }

    return completed;
  }


  async fail(id: string, code: string, reason?: string): Promise<void> {
    await prisma.transaction.updateMany({
      where: {
        id,
        status: TransactionStatus.PENDING,
      },
      data: {
        status: TransactionStatus.FAILED,
        failureCode: code,
        failureReason: reason ?? code,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Projects a `TransactionWithLedger` into a `TransactionDto` with `reference` ("TX-000123")
   * and `balanceAfter` (`from` and `to`) derived from `ledger_entries`.
   */
  toDto(txn: TransactionWithLedger): TransactionDto {
    const fromEntry = txn.ledgerEntries.find(
      (e) => e.walletId === txn.fromWalletId,
    );
    const toEntry = txn.ledgerEntries.find((e) => e.walletId === txn.toWalletId);

    const fromBalanceAfter =
      fromEntry !== undefined ? Number(fromEntry.balanceAfter) : null;
    const toBalanceAfter =
      toEntry !== undefined ? Number(toEntry.balanceAfter) : null;

    return {
      id: txn.id,
      seq: txn.seq,
      reference: formatTxReference(txn.seq),
      type: txn.type,
      status: txn.status,
      userId: txn.userId,
      fromWalletId: txn.fromWalletId,
      toWalletId: txn.toWalletId,
      amount: Number(txn.amount),
      idempotencyKey: txn.idempotencyKey,
      failureCode: txn.failureCode,
      failureReason: txn.failureReason,
      verificationCode: txn.verificationCode ? txn.verificationCode.trim() : null,
      balanceAfter: {
        from: fromBalanceAfter,
        to: toBalanceAfter,
      },
      fromBalanceAfter,
      toBalanceAfter,
      createdAt: txn.createdAt.toISOString(),
      completedAt: txn.completedAt ? txn.completedAt.toISOString() : null,
    };
  }

  /**
   * Handles idempotent replay for an existing transaction row:
   * - Hash mismatch -> throws `IDEMPOTENCY_KEY_REUSED` (422)
   * - `PENDING` -> throws `IN_PROGRESS` (409)
   * - `FAILED` -> throws an `AppError` rebuilt from `failure_code` (same HTTP status and code)
   * - `COMPLETED` -> returns the DTO marked as replayed
   */
  replay(existing: TransactionWithLedger, hash: string): TransactionDto {
    if (existing.requestHash.trim() !== hash.trim()) {
      throw new AppError('IDEMPOTENCY_KEY_REUSED');
    }

    if (existing.status === TransactionStatus.PENDING) {
      throw new AppError('IN_PROGRESS');
    }

    if (existing.status === TransactionStatus.FAILED) {
      const code = existing.failureCode ?? 'INTERNAL';
      throw new AppError(code, undefined, existing.failureReason ?? undefined);
    }

    const dto = this.toDto(existing);
    Object.defineProperty(dto, REPLAYED_SYMBOL, {
      value: true,
      enumerable: false,
    });
    return dto;
  }
}

export const transactionRepository = new TransactionRepository();

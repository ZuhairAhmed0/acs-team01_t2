import { AppError } from '../errors/app-error.js';
import type { Prisma, WalletType } from '../generated/prisma/client.js';

export interface LedgerMoveResult {
  fromBalanceAfter: bigint;
  toBalanceAfter: bigint;
}

/**
 * Double-entry ledger service for moving funds atomically between two wallets.
 * Invariants:
 * 1. Only this method may mutate `wallets.balance`, always inside `prisma.$transaction`.
 * 2. Locks both wallets with `SELECT ... ORDER BY id FOR UPDATE` to prevent deadlocks.
 * 3. Performs a guarded `UPDATE` (`type = 'BANK_SIM' OR balance >= amount`); 0 rows -> `INSUFFICIENT_FUNDS`.
 * 4. Writes exactly 2 `ledger_entries` rows (`-amount` and `+amount`) with `balance_after`.
 */
export class LedgerService {
  async move(
    tx: Prisma.TransactionClient,
    txnId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: bigint,
  ): Promise<LedgerMoveResult> {
    if (amount <= 0n) {
      throw new AppError('INVALID_AMOUNT');
    }

    if (fromWalletId === toWalletId) {
      throw new AppError('SAME_WALLET');
    }

    // 1. Lock both wallets in deterministic UUID order to prevent deadlocks
    const locked = await tx.$queryRaw<
      Array<{ id: string; type: WalletType; balance: bigint }>
    >`
      SELECT "id", "type", "balance"
      FROM "wallets"
      WHERE "id" IN (${fromWalletId}::uuid, ${toWalletId}::uuid)
      ORDER BY "id" ASC
      FOR UPDATE
    `;

    const fromWallet = locked.find((w) => w.id === fromWalletId);
    const toWallet = locked.find((w) => w.id === toWalletId);

    if (!fromWallet || !toWallet) {
      throw new AppError('NOT_FOUND');
    }

    // 2. Guarded debit on source wallet (BANK_SIM may go negative; all others require balance >= amount)
    const debited = await tx.$queryRaw<Array<{ balance: bigint }>>`
      UPDATE "wallets"
      SET "balance" = "balance" - ${amount}
      WHERE "id" = ${fromWalletId}::uuid
        AND ("type" = 'BANK_SIM'::"WalletType" OR "balance" >= ${amount})
      RETURNING "balance"
    `;

    if (debited.length === 0) {
      throw new AppError('INSUFFICIENT_FUNDS');
    }

    const fromBalanceAfter = debited[0]!.balance;

    // 3. Credit destination wallet
    const credited = await tx.$queryRaw<Array<{ balance: bigint }>>`
      UPDATE "wallets"
      SET "balance" = "balance" + ${amount}
      WHERE "id" = ${toWalletId}::uuid
      RETURNING "balance"
    `;

    if (credited.length === 0) {
      throw new AppError('NOT_FOUND');
    }

    const toBalanceAfter = credited[0]!.balance;

    // 4. Write exactly 2 append-only ledger entries
    await tx.ledgerEntry.createMany({
      data: [
        {
          transactionId: txnId,
          walletId: fromWalletId,
          delta: -amount,
          balanceAfter: fromBalanceAfter,
        },
        {
          transactionId: txnId,
          walletId: toWalletId,
          delta: amount,
          balanceAfter: toBalanceAfter,
        },
      ],
    });

    return { fromBalanceAfter, toBalanceAfter };
  }
}

export const ledgerService = new LedgerService();

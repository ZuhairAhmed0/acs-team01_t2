import { prisma } from '../db/prisma.js';
import type { Prisma, TransactionStatus, WalletType } from '../generated/prisma/client.js';

export interface ReconciliationIssue {
  check:
    | 'WALLET_BALANCE_MISMATCH'
    | 'TRANSACTION_LEDGER_IMBALANCE'
    | 'NON_COMPLETED_TXN_HAS_LEDGER_ENTRIES'
    | 'SYSTEM_BALANCE_SUM_NON_ZERO';
  message: string;
  walletId?: string;
  walletType?: WalletType;
  walletBalance?: number;
  ledgerSum?: number;
  transactionId?: string;
  status?: TransactionStatus;
  entryCount?: number;
  deltaSum?: number;
  totalBalance?: number;
}

export interface ReconciliationReport {
  ok: boolean;
  checkedAt: string;
  issues: ReconciliationIssue[];
}

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Ledger reconciliation service verifying system-wide financial invariants:
 * (1) Every wallet balance equals the sum of its ledger deltas.
 * (2) Every transaction with entries (and every COMPLETED transaction) has† 2 rows summing to 0.
 * (3) Non-COMPLETED transactions have no ledger entries.
 * (4) The sum of ALL wallet balances is 0.
 */
export class ReconcileService {
  async reconcile(client: DbClient = prisma): Promise<ReconciliationReport> {
    const issues: ReconciliationIssue[] = [];

    // (1) Every wallet balance equals the sum of its ledger deltas
    const walletMismatches = await client.$queryRaw<
      Array<{
        walletId: string;
        walletType: WalletType;
        walletBalance: bigint;
        ledgerSum: bigint;
      }>
    >`
      SELECT
        w."id" AS "walletId",
        w."type" AS "walletType",
        w."balance" AS "walletBalance",
        COALESCE(SUM(le."delta"), 0)::bigint AS "ledgerSum"
      FROM "wallets" w
      LEFT JOIN "ledger_entries" le ON le."wallet_id" = w."id"
      GROUP BY w."id", w."type", w."balance"
      HAVING w."balance" <> COALESCE(SUM(le."delta"), 0)::bigint
    `;

    for (const row of walletMismatches) {
      issues.push({
        check: 'WALLET_BALANCE_MISMATCH',
        walletId: row.walletId,
        walletType: row.walletType,
        walletBalance: Number(row.walletBalance),
        ledgerSum: Number(row.ledgerSum),
        message: `Wallet ${row.walletId} (${row.walletType}) balance ${row.walletBalance} != ledger sum ${row.ledgerSum}`,
      });
    }

    // (2) Every transaction with entries (and every COMPLETED transaction) has† 2 rows summing to 0
    const txnImbalances = await client.$queryRaw<
      Array<{
        transactionId: string;
        entryCount: number;
        deltaSum: bigint;
      }>
    >`
      SELECT
        t."id" AS "transactionId",
        COUNT(le."id")::int AS "entryCount",
        COALESCE(SUM(le."delta"), 0)::bigint AS "deltaSum"
      FROM "transactions" t
      LEFT JOIN "ledger_entries" le ON le."transaction_id" = t."id"
      WHERE t."status" = 'COMPLETED'::"TransactionStatus"
         OR le."id" IS NOT NULL
      GROUP BY t."id"
      HAVING COUNT(le."id") <> 2 OR COALESCE(SUM(le."delta"), 0)::bigint <> 0
    `;

    for (const row of txnImbalances) {
      issues.push({
        check: 'TRANSACTION_LEDGER_IMBALANCE',
        transactionId: row.transactionId,
        entryCount: Number(row.entryCount),
        deltaSum: Number(row.deltaSum),
        message: `Transaction ${row.transactionId} has ${row.entryCount} ledger entries summing to ${row.deltaSum}`,
      });
    }

    // (3) Non-COMPLETED transactions have no ledger entries
    const nonCompletedWithEntries = await client.$queryRaw<
      Array<{
        transactionId: string;
        status: TransactionStatus;
        entryCount: number;
      }>
    >`
      SELECT
        t."id" AS "transactionId",
        t."status" AS "status",
        COUNT(le."id")::int AS "entryCount"
      FROM "transactions" t
      INNER JOIN "ledger_entries" le ON le."transaction_id" = t."id"
      WHERE t."status" <> 'COMPLETED'::"TransactionStatus"
      GROUP BY t."id", t."status"
    `;

    for (const row of nonCompletedWithEntries) {
      issues.push({
        check: 'NON_COMPLETED_TXN_HAS_LEDGER_ENTRIES',
        transactionId: row.transactionId,
        status: row.status,
        entryCount: Number(row.entryCount),
        message: `Non-COMPLETED transaction ${row.transactionId} (${row.status}) has ${row.entryCount} ledger entries`,
      });
    }

    // (4) The sum of ALL wallet balances is 0
    const totalRows = await client.$queryRaw<Array<{ totalBalance: bigint }>>`
      SELECT COALESCE(SUM("balance"), 0)::bigint AS "totalBalance"
      FROM "wallets"
    `;

    const totalBalance = totalRows[0]?.totalBalance ?? 0n;
    if (totalBalance !== 0n) {
      issues.push({
        check: 'SYSTEM_BALANCE_SUM_NON_ZERO',
        totalBalance: Number(totalBalance),
        message: `Total sum of all wallet balances is ${totalBalance} (expected 0)`,
      });
    }

    return {
      ok: issues.length === 0,
      checkedAt: new Date().toISOString(),
      issues,
    };
  }
}

export const reconcileService = new ReconcileService();

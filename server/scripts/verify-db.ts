import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, WalletType } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required to verify database.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const EXPECTED_INDEXES = [
  'ux_wallet_main_per_user',
  'ux_wallet_station_per_user',
  'ux_wallet_revenue_per_station',
  'ux_wallet_single_bank',
] as const;

const EXPECTED_CONSTRAINTS = [
  'chk_wallet_owner',
  'chk_wallet_balance',
  'chk_txn_amount',
  'chk_txn_diff_wallets',
  'chk_txn_failed_code',
  'chk_ledger_delta',
] as const;

const EXPECTED_TRIGGER = 'trg_ledger_immutable';

async function verify(): Promise<void> {
  // 1. Check partial unique indexes in pg_indexes
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'ux_wallet_main_per_user',
        'ux_wallet_station_per_user',
        'ux_wallet_revenue_per_station',
        'ux_wallet_single_bank'
      )
    ORDER BY indexname
  `;
  const foundIndexes = new Set(indexes.map((r) => r.indexname));
  console.log('Found partial unique indexes:', [...foundIndexes]);

  for (const idx of EXPECTED_INDEXES) {
    if (!foundIndexes.has(idx)) {
      throw new Error(`Missing required partial unique index: ${idx}`);
    }
  }

  // 2. Check CHECK constraints in pg_constraint
  const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
    SELECT conname
    FROM pg_constraint
    WHERE conname LIKE 'chk_%'
    ORDER BY conname
  `;
  const foundConstraints = new Set(constraints.map((r) => r.conname));
  console.log('Found CHECK constraints:', [...foundConstraints]);

  for (const chk of EXPECTED_CONSTRAINTS) {
    if (!foundConstraints.has(chk)) {
      throw new Error(`Missing required CHECK constraint: ${chk}`);
    }
  }

  // 3. Check trigger in pg_trigger
  const triggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
    SELECT tgname
    FROM pg_trigger
    WHERE tgname = ${EXPECTED_TRIGGER}
  `;
  console.log(
    'Found triggers:',
    triggers.map((t) => t.tgname),
  );
  if (triggers.length === 0) {
    throw new Error(`Missing required trigger: ${EXPECTED_TRIGGER}`);
  }

  // 4. Inside a transaction that is always rolled back, try inserting a USER_MAIN wallet with balance = -1
  let negativeBalanceRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      const tempUser = await tx.user.create({
        data: {
          clerkUserId: `verify_rollback_${Date.now()}`,
        },
      });

      try {
        await tx.wallet.create({
          data: {
            type: WalletType.USER_MAIN,
            userId: tempUser.id,
            balance: -1n,
          },
        });
      } catch {
        negativeBalanceRejected = true;
      }

      throw new Error('__FORCE_ROLLBACK__');
    });
  } catch (err) {
    if (!(err instanceof Error && err.message === '__FORCE_ROLLBACK__')) {
      throw err;
    }
  }

  if (!negativeBalanceRejected) {
    throw new Error('Expected Postgres to reject USER_MAIN wallet with balance = -1, but insert succeeded');
  }
  console.log('Verified negative balance rejection on USER_MAIN wallet (rolled back cleanly).');
  console.log('All database verifications passed.');
}

verify()
  .catch((err) => {
    console.error('Database verification failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


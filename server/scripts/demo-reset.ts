import 'dotenv/config';
import path from 'node:path';
import { prisma } from '../src/db/prisma.js';

/**
 * Resets the database for a clean live demo while preserving users, stations,
 * USER_MAIN wallets, STATION_REVENUE wallets, and the BANK_SIM wallet:
 * 1. Refuses to run when `NODE_ENV=production`.
 * 2. `TRUNCATE ledger_entries, transactions RESTART IDENTITY` (append-only trigger does not fire on TRUNCATE).
 * 3. `DELETE FROM wallets WHERE type='USER_STATION'`.
 * 4. `UPDATE wallets SET balance = 0`.
 * 5. Resets `bank_gateway_status` to `"UP"`.
 */
export async function demoReset(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run demo-reset when NODE_ENV=production.');
  }

  await prisma.$transaction([
    prisma.$executeRaw`TRUNCATE TABLE "ledger_entries", "transactions" RESTART IDENTITY CASCADE`,
    prisma.$executeRaw`DELETE FROM "wallets" WHERE "type" = 'USER_STATION'::"WalletType"`,
    prisma.$executeRaw`UPDATE "wallets" SET "balance" = 0`,
    prisma.systemSetting.upsert({
      where: { key: 'bank_gateway_status' },
      update: { value: 'UP' },
      create: { key: 'bank_gateway_status', value: 'UP' },
    }),
    prisma.station.updateMany({
      data: {
        isActive: true,
        congestion: 'LOW',
      },
    }),
  ]);
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]).toLowerCase() ===
    path.resolve(import.meta.filename).toLowerCase();

if (isMain) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run demo-reset when NODE_ENV=production.');
    process.exit(1);
  }

  demoReset()
    .then(() => {
      console.log(
        'Demo reset complete: ledger_entries & transactions truncated, USER_STATION wallets deleted, balances reset to 0, bank_gateway_status set to UP.',
      );
    })
    .catch((err) => {
      console.error('Demo reset failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


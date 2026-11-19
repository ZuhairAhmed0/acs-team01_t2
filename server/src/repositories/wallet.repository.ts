import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { type Wallet, WalletType } from '../generated/prisma/client.js';

/**
 * Repository for wallet lookups and idempotent USER_STATION wallet provisioning.
 * Note: Balance updates are strictly forbidden here and must go through `LedgerService.move()`.
 */
export class WalletRepository {
  /**
   * Returns the user's `USER_MAIN` wallet, throwing `NOT_FOUND` if missing.
   */
  async getMainWallet(userId: string): Promise<Wallet> {
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        type: WalletType.USER_MAIN,
      },
    });

    if (!wallet) {
      throw new AppError('NOT_FOUND');
    }

    return wallet;
  }

  /**
   * Returns the specified wallet if and only if it belongs to `userId` (`null` if not owned or not found).
   */
  async getOwnedWallet(userId: string, walletId: string): Promise<Wallet | null> {
    return prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId,
      },
    });
  }

  /**
   * Returns the `STATION_REVENUE` wallet for `stationId`, throwing `NOT_FOUND` if missing.
   */
  async getRevenueWallet(stationId: string): Promise<Wallet> {
    const wallet = await prisma.wallet.findFirst({
      where: {
        stationId,
        type: WalletType.STATION_REVENUE,
      },
    });

    if (!wallet) {
      throw new AppError('NOT_FOUND');
    }

    return wallet;
  }

  /**
   * Returns the single `BANK_SIM` wallet, throwing `INTERNAL` if not seeded.
   */
  async getBankWallet(): Promise<Wallet> {
    const wallet = await prisma.wallet.findFirst({
      where: {
        type: WalletType.BANK_SIM,
      },
    });

    if (!wallet) {
      throw new AppError('INTERNAL');
    }

    return wallet;
  }

  /**
   * Idempotently ensures the `USER_STATION` wallet exists for `(userId, stationId)`
   * using raw `INSERT ... ON CONFLICT (user_id, station_id) WHERE type='USER_STATION' DO NOTHING`,
   * then selects and returns it.
   */
  async ensureStationWallet(userId: string, stationId: string): Promise<Wallet> {
    await prisma.$executeRaw`
      INSERT INTO "wallets" ("type", "user_id", "station_id", "balance")
      VALUES ('USER_STATION'::"WalletType", ${userId}::uuid, ${stationId}::uuid, 0)
      ON CONFLICT ("user_id", "station_id") WHERE "type" = 'USER_STATION'
      DO NOTHING
    `;

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        stationId,
        type: WalletType.USER_STATION,
      },
    });

    if (!wallet) {
      throw new AppError('INTERNAL');
    }

    return wallet;
  }
}

export const walletRepository = new WalletRepository();

import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { WalletType } from '../generated/prisma/client.js';

/**
 * Generates a deterministic 6-digit short numeric wallet number (100000–999999) from a wallet UUID.
 */
export function toShortWalletNumber(walletId: string): number {
  const hex = walletId.replace(/-/g, '').slice(0, 8);
  const parsed = Number.parseInt(hex, 16);
  if (Number.isNaN(parsed)) {
    return 100001;
  }
  return 100000 + (parsed % 900000);
}

/**
 * Returns the authenticated user's profile, main wallet, station wallets, and total balance.
 * Endpoint: GET /api/me
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      fullName: true,
      role: true,
      status: true,
      operatorStationId: true,
      wallets: {
        where: {
          type: {
            in: [WalletType.USER_MAIN, WalletType.USER_STATION],
          },
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!dbUser) {
    throw new AppError('NOT_FOUND');
  }

  const mainWallet = dbUser.wallets.find(
    (w) => w.type === WalletType.USER_MAIN,
  );
  if (!mainWallet) {
    throw new AppError('INTERNAL');
  }

  const stationWallets = dbUser.wallets
    .filter(
      (w) =>
        w.type === WalletType.USER_STATION &&
        w.stationId !== null &&
        w.station !== null,
    )
    .map((w) => ({
      walletId: w.id,
      walletNumber: toShortWalletNumber(w.id),
      stationId: w.stationId!,
      stationName: w.station!.name,
      balance: Number(w.balance),
    }));

  const totalBalance = dbUser.wallets.reduce((sum, w) => sum + w.balance, 0n);

  res.status(200).json({
    data: {
      user: {
        id: dbUser.id,
        fullName: dbUser.fullName,
        role: dbUser.role,
        status: dbUser.status,
        operatorStationId: dbUser.operatorStationId,
      },
      wallets: {
        main: {
          id: mainWallet.id,
          walletNumber: toShortWalletNumber(mainWallet.id),
          balance: Number(mainWallet.balance),
        },
        stations: stationWallets,
      },
      totalBalance: Number(totalBalance),
    },
  });
}

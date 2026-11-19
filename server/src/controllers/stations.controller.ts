import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  type CongestionLevel,
  type Station,
  TransactionStatus,
  WalletType,
} from '../generated/prisma/client.js';

export interface StationDto {
  id: string;
  name: string;
  city: string;
  address: string | null;
  isActive: boolean;
  congestion: CongestionLevel;
  myStationWalletId: string | null;
  myStationBalance: number;
  mainBalance: number;
  availableHere: number;
}

function toStationDto(
  station: Station,
  mainBalance: bigint,
  stationWallet?: { id: string; balance: bigint },
): StationDto {
  const myStationBalance = stationWallet?.balance ?? 0n;
  const availableHere = myStationBalance + mainBalance;

  return {
    id: station.id,
    name: station.name,
    city: station.city,
    address: station.address,
    isActive: station.isActive,
    congestion: station.congestion,
    myStationWalletId: stationWallet?.id ?? null,
    myStationBalance: Number(myStationBalance),
    mainBalance: Number(mainBalance),
    availableHere: Number(availableHere),
  };
}

export async function listStations(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const rawCity =
    typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const cityFilter = rawCity.length > 0 ? rawCity : undefined;

  const [stations, userWallets] = await Promise.all([
    prisma.station.findMany({
      ...(cityFilter !== undefined ? { where: { city: cityFilter } } : {}),
      orderBy: { name: 'asc' },
    }),
    prisma.wallet.findMany({
      where: {
        userId: req.user.id,
        type: { in: [WalletType.USER_MAIN, WalletType.USER_STATION] },
      },
      select: {
        id: true,
        type: true,
        stationId: true,
        balance: true,
      },
    }),
  ]);

  const mainWallet = userWallets.find((w) => w.type === WalletType.USER_MAIN);
  const mainBalance = mainWallet?.balance ?? 0n;

  const stationWalletByStationId = new Map<
    string,
    { id: string; balance: bigint }
  >();
  for (const w of userWallets) {
    if (w.type === WalletType.USER_STATION && w.stationId !== null) {
      stationWalletByStationId.set(w.stationId, {
        id: w.id,
        balance: w.balance,
      });
    }
  }

  const data: StationDto[] = stations.map((station) =>
    toStationDto(
      station,
      mainBalance,
      stationWalletByStationId.get(station.id),
    ),
  );

  res.status(200).json({ data });
}

export async function getStationById(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const stationId = String(req.params.id);

  const [station, userWallets] = await Promise.all([
    prisma.station.findUnique({
      where: { id: stationId },
    }),
    prisma.wallet.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { type: WalletType.USER_MAIN },
          { type: WalletType.USER_STATION, stationId },
        ],
      },
      select: {
        id: true,
        type: true,
        stationId: true,
        balance: true,
      },
    }),
  ]);

  if (!station) {
    throw new AppError('NOT_FOUND');
  }

  const mainWallet = userWallets.find((w) => w.type === WalletType.USER_MAIN);
  const mainBalance = mainWallet?.balance ?? 0n;
  const stationWallet = userWallets.find(
    (w) => w.type === WalletType.USER_STATION && w.stationId === station.id,
  );

  const data = toStationDto(
    station,
    mainBalance,
    stationWallet
      ? { id: stationWallet.id, balance: stationWallet.balance }
      : undefined,
  );

  res.status(200).json({ data });
}

/**
 * Creates a new fuel station along with its mandatory `STATION_REVENUE` wallet.
 * Endpoint: POST /api/stations (and POST /api/admin/stations)
 */
export async function createStation(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const { name, city, address, congestion, isActive } = req.body as {
    name: string;
    city: string;
    address?: string | null;
    congestion?: CongestionLevel;
    isActive?: boolean;
  };

  const duplicate = await prisma.station.findFirst({
    where: { name, city },
    select: { id: true },
  });

  if (duplicate) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      'توجد محطة بنفس الاسم في هذه المدينة مسبقاً',
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const station = await tx.station.create({
      data: {
        name,
        city,
        address: address ?? null,
        congestion: congestion ?? 'LOW',
        isActive: isActive ?? true,
      },
    });

    await tx.wallet.create({
      data: {
        type: WalletType.STATION_REVENUE,
        stationId: station.id,
        balance: 0n,
      },
    });

    return station;
  });

  const mainWallet = await prisma.wallet.findFirst({
    where: { userId: req.user.id, type: WalletType.USER_MAIN },
    select: { balance: true },
  });

  res
    .status(201)
    .json({ data: toStationDto(created, mainWallet?.balance ?? 0n) });
}

/**
 * Updates an existing station's details (`name`, `city`, `address`, `congestion`, `isActive`).
 * Endpoint: PATCH /api/stations/:id (and PATCH /api/admin/stations/:id)
 */
export async function updateStation(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const id = String(req.params.id);
  const { name, city, address, congestion, isActive } = req.body as {
    name?: string;
    city?: string;
    address?: string | null;
    congestion?: CongestionLevel;
    isActive?: boolean;
  };

  const existing = await prisma.station.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND');
  }

  const nextName = name ?? existing.name;
  const nextCity = city ?? existing.city;

  if (nextName !== existing.name || nextCity !== existing.city) {
    const duplicate = await prisma.station.findFirst({
      where: {
        name: nextName,
        city: nextCity,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'توجد محطة بنفس الاسم في هذه المدينة مسبقاً',
      );
    }
  }

  const updated = await prisma.station.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(congestion !== undefined ? { congestion } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  res.status(200).json({ data: updated });
}

/**
 * Deletes a station and cleans up its associated wallets while preserving ledger reconciliation invariants.
 * Endpoint: DELETE /api/stations/:id (and DELETE /api/admin/stations/:id)
 */
export async function deleteStation(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const id = String(req.params.id);

  const existing = await prisma.station.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    const stationWallets = await tx.wallet.findMany({
      where: { stationId: id },
      select: { id: true },
    });
    const stationWalletIds = stationWallets.map((w) => w.id);
    const stationWalletIdSet = new Set(stationWalletIds);

    if (stationWalletIds.length > 0) {
      const relatedTxns = await tx.transaction.findMany({
        where: {
          OR: [
            { fromWalletId: { in: stationWalletIds } },
            { toWalletId: { in: stationWalletIds } },
          ],
        },
        select: {
          id: true,
          status: true,
          fromWalletId: true,
          toWalletId: true,
          amount: true,
        },
      });

      if (relatedTxns.length > 0) {
        // Reverse any COMPLETED balance movements on non-deleted counterparty wallets so SUM(all wallets) stays 0
        for (const t of relatedTxns) {
          if (t.status !== TransactionStatus.COMPLETED) continue;
          if (!stationWalletIdSet.has(t.fromWalletId)) {
            await tx.wallet.update({
              where: { id: t.fromWalletId },
              data: { balance: { increment: t.amount } },
            });
          }
          if (!stationWalletIdSet.has(t.toWalletId)) {
            await tx.wallet.update({
              where: { id: t.toWalletId },
              data: { balance: { decrement: t.amount } },
            });
          }
        }

        const txnIds = relatedTxns.map((t) => t.id);
        await tx.$executeRaw`ALTER TABLE "ledger_entries" DISABLE TRIGGER trg_ledger_immutable`;
        await tx.ledgerEntry.deleteMany({
          where: { transactionId: { in: txnIds } },
        });
        await tx.$executeRaw`ALTER TABLE "ledger_entries" ENABLE TRIGGER trg_ledger_immutable`;

        await tx.transaction.deleteMany({
          where: { id: { in: txnIds } },
        });
      }

      await tx.wallet.deleteMany({
        where: { id: { in: stationWalletIds } },
      });
    }

    await tx.user.updateMany({
      where: { operatorStationId: id },
      data: { operatorStationId: null },
    });

    await tx.station.delete({
      where: { id },
    });
  });

  res.status(200).json({ data: { id, deleted: true } });
}

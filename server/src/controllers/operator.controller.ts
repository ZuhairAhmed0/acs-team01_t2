import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import {
  type CongestionLevel,
  type Prisma,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma/client.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import {
  assignOperatorStationSchema,
  operatorLookupQuerySchema,
  operatorPaymentsQuerySchema,
  operatorStationQuerySchema,
  updateStationCongestionSchema,
} from '../schemas/operator.js';
import { decodeCursor, encodeCursor } from '../schemas/transaction.js';
import { formatTxReference } from '../utils/tx-reference.js';

const LOOKUP_WINDOW_MS = 30 * 60 * 1000;

export interface OperatorPaymentDto {
  id: string;
  reference: string;
  stationId: string;
  amount: number;
  verificationCode: string | null;
  payerName: string;
  maskedPayerName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface OperatorSummaryDto {
  stationId: string;
  stationName: string;
  congestion: CongestionLevel;
  isActive: boolean;
  totalAmount: number;
  todayTotalAmount: number;
  paymentCount: number;
  todayPaymentCount: number;
  revenueBalance: number;
  date: string;
}

const operatorPaymentInclude = {
  user: {
    select: {
      fullName: true,
    },
  },
} as const satisfies Prisma.TransactionInclude;

type TransactionWithPayer = Prisma.TransactionGetPayload<{
  include: typeof operatorPaymentInclude;
}>;

/**
 * Masks a payer's full name for operator display (e.g. "أحمد محمد" -> "أ*** م***").
 */
export function maskPayerName(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim().length === 0) {
    return '***';
  }

  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => {
      const chars = Array.from(part);
      return `${chars[0] ?? ''}***`;
    })
    .join(' ');
}

function toOperatorPaymentDto(
  txn: TransactionWithPayer,
  stationId: string,
): OperatorPaymentDto {
  const masked = maskPayerName(txn.user.fullName);
  return {
    id: txn.id,
    reference: formatTxReference(txn.seq),
    stationId,
    amount: Number(txn.amount),
    verificationCode: txn.verificationCode ? txn.verificationCode.trim() : null,
    payerName: masked,
    maskedPayerName: masked,
    createdAt: txn.createdAt.toISOString(),
    completedAt: txn.completedAt ? txn.completedAt.toISOString() : null,
  };
}

/**
 * Resolves the station ID for an operator or admin request:
 * - `OPERATOR`: scoped to `users.operator_station_id`. If `operator_station_id` is `null`
 *   (e.g. role promoted in DB console without setting a station), automatically assigns
 *   the operator to `requestedStationId` or the first available station in PostgreSQL!
 * - `ADMIN`: uses `?stationId=` (or falls back to `operator_station_id` or first station).
 */
export async function resolveOperatorStationId(
  req: Request,
  requestedStationId?: string,
): Promise<string> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  let assignedStationId = req.user.operatorStationId ?? null;
  if (!assignedStationId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { operatorStationId: true },
    });
    assignedStationId = dbUser?.operatorStationId ?? null;
  }

  if (req.user.role === 'OPERATOR') {
    if (!assignedStationId) {
      const fallbackStation = requestedStationId
        ? await prisma.station.findUnique({
            where: { id: requestedStationId },
            select: { id: true },
          })
        : await prisma.station.findFirst({
            orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
            select: { id: true },
          });

      if (!fallbackStation) {
        throw new AppError('NOT_FOUND');
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: { operatorStationId: fallbackStation.id },
      });
      req.user.operatorStationId = fallbackStation.id;
      return fallbackStation.id;
    }

    if (requestedStationId && requestedStationId !== assignedStationId) {
      throw new AppError('FORBIDDEN');
    }
    return assignedStationId;
  }

  if (req.user.role === 'ADMIN') {
    let targetStationId = requestedStationId ?? assignedStationId;
    if (!targetStationId) {
      const firstStation = await prisma.station.findFirst({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      targetStationId = firstStation?.id ?? null;
    }
    if (!targetStationId) {
      throw new AppError('NOT_FOUND');
    }
    return targetStationId;
  }

  throw new AppError('FORBIDDEN');
}

/**
 * Allows an operator (or admin) to assign/switch their active operator station.
 * Endpoint: PATCH /api/operator/assign-station { stationId }
 */
export async function assignOperatorStation(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const { stationId } = assignOperatorStationSchema.parse(req.body);

  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    throw new AppError('NOT_FOUND');
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { operatorStationId: station.id },
  });
  req.user.operatorStationId = station.id;

  res.status(200).json({
    data: {
      operatorStationId: station.id,
      station,
    },
  });
}

/**
 * Lists COMPLETED payments into the operator's station revenue wallet with opaque cursor pagination.
 * Endpoint: GET /api/operator/payments?limit=&cursor=
 */
export async function listOperatorPayments(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedQuery = operatorPaymentsQuerySchema.parse(req.query ?? {});
  const { limit, cursor, stationId: requestedStationId } = parsedQuery;

  const stationId = await resolveOperatorStationId(req, requestedStationId);
  const revenueWallet = await walletRepository.getRevenueWallet(stationId);

  let decodedCursor: { createdAt: string; id: string } | undefined;
  if (cursor) {
    decodedCursor = decodeCursor(cursor);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        decodedCursor.id,
      )
    ) {
      throw new AppError('VALIDATION_ERROR');
    }
  }

  const rows = await prisma.transaction.findMany({
    where: {
      toWalletId: revenueWallet.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
    },
    include: operatorPaymentInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(decodedCursor !== undefined
      ? { cursor: { id: decodedCursor.id }, skip: 1 }
      : {}),
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map((row) => toOperatorPaymentDto(row, stationId));

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeCursor({
          createdAt: lastRow.createdAt.toISOString(),
          id: lastRow.id,
        })
      : null;

  res.status(200).json({
    data: {
      items,
      nextCursor,
    },
  });
}

/**
 * Looks up a COMPLETED payment at the operator's station created within the last 30 minutes
 * matching the 6-digit verification code.
 * Endpoint: GET /api/operator/payments/lookup?code=123456
 */
export async function lookupOperatorPayment(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedQuery = operatorLookupQuerySchema.parse(req.query ?? {});
  const stationId = await resolveOperatorStationId(req, parsedQuery.stationId);
  const revenueWallet = await walletRepository.getRevenueWallet(stationId);

  const cutoff = new Date(Date.now() - LOOKUP_WINDOW_MS);

  const txn = await prisma.transaction.findFirst({
    where: {
      toWalletId: revenueWallet.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      verificationCode: parsedQuery.code,
      createdAt: {
        gte: cutoff,
      },
    },
    include: operatorPaymentInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  if (!txn) {
    throw new AppError('NOT_FOUND');
  }

  res.status(200).json({
    data: toOperatorPaymentDto(txn, stationId),
  });
}

/**
 * Updates the congestion level (`'LOW' | 'MEDIUM' | 'HIGH'`) of the operator's station.
 * Endpoint: PATCH /api/operator/station { congestion: 'LOW' | 'MEDIUM' | 'HIGH' }
 */
export async function updateStationCongestion(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedQuery = operatorStationQuerySchema.parse(req.query ?? {});
  const parsedBody = updateStationCongestionSchema.parse(req.body);

  const stationId = await resolveOperatorStationId(
    req,
    parsedQuery.stationId ?? parsedBody.stationId,
  );

  const existing = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND');
  }

  const updated = await prisma.station.update({
    where: { id: stationId },
    data: {
      congestion: parsedBody.congestion,
    },
  });

  res.status(200).json({
    data: updated,
  });
}

/**
 * Returns today's total payment amount and payment count for the operator's station.
 * Endpoint: GET /api/operator/summary
 */
export async function getOperatorSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedQuery = operatorStationQuerySchema.parse(req.query ?? {});
  const stationId = await resolveOperatorStationId(req, parsedQuery.stationId);

  const [station, revenueWallet] = await Promise.all([
    prisma.station.findUnique({
      where: { id: stationId },
    }),
    walletRepository.getRevenueWallet(stationId),
  ]);

  if (!station) {
    throw new AppError('NOT_FOUND');
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  const agg = await prisma.transaction.aggregate({
    where: {
      toWalletId: revenueWallet.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      createdAt: {
        gte: startOfToday,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });

  const totalAmount = Number(agg._sum.amount ?? 0n);
  const paymentCount = agg._count._all;

  const summary: OperatorSummaryDto = {
    stationId: station.id,
    stationName: station.name,
    congestion: station.congestion,
    isActive: station.isActive,
    totalAmount,
    todayTotalAmount: totalAmount,
    paymentCount,
    todayPaymentCount: paymentCount,
    revenueBalance: Number(revenueWallet.balance),
    date: startOfToday.toISOString().slice(0, 10),
  };

  res.status(200).json({
    data: summary,
  });
}

export const getOperatorStationDashboard = getOperatorSummary;

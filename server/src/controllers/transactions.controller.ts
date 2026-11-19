import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { ERROR_CATALOG, type ErrorCode } from '../errors/catalog.js';
import {
  type Prisma,
  TransactionStatus,
  TransactionType,
  WalletType,
} from '../generated/prisma/client.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import {
  decodeCursor,
  encodeCursor,
  listTransactionsQuerySchema,
  walletLedgerQuerySchema,
} from '../schemas/transaction.js';
import { formatTxReference } from '../utils/tx-reference.js';

export interface WalletEndpointInfoDto {
  walletId: string;
  type: WalletType;
  stationId: string | null;
  stationName: string | null;
}

export interface TransactionHistoryItemDto {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  from: WalletEndpointInfoDto;
  to: WalletEndpointInfoDto;
  failureCode: string | null;
  failureMessage: string | null;
  verificationCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WalletLedgerEntryDto {
  id: string;
  transactionId: string;
  reference: string;
  transactionReference: string;
  type: TransactionType;
  delta: number;
  balanceAfter: number;
  createdAt: string;
}

const transactionHistoryInclude = {
  fromWallet: {
    select: {
      id: true,
      type: true,
      stationId: true,
      station: {
        select: {
          name: true,
        },
      },
    },
  },
  toWallet: {
    select: {
      id: true,
      type: true,
      stationId: true,
      station: {
        select: {
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.TransactionInclude;

type TransactionWithEndpoints = Prisma.TransactionGetPayload<{
  include: typeof transactionHistoryInclude;
}>;

function resolveArabicFailureMessage(
  status: TransactionStatus,
  failureCode: string | null,
  failureReason: string | null,
): string | null {
  if (status !== TransactionStatus.FAILED) {
    return null;
  }

  if (failureCode && failureCode in ERROR_CATALOG) {
    return ERROR_CATALOG[failureCode as ErrorCode].message;
  }

  return failureReason ?? ERROR_CATALOG.INTERNAL.message;
}

function toHistoryItemDto(
  txn: TransactionWithEndpoints,
): TransactionHistoryItemDto {
  const isCompletedPayment =
    txn.type === TransactionType.PAYMENT &&
    txn.status === TransactionStatus.COMPLETED;

  return {
    id: txn.id,
    reference: formatTxReference(txn.seq),
    type: txn.type,
    status: txn.status,
    amount: Number(txn.amount),
    from: {
      walletId: txn.fromWallet.id,
      type: txn.fromWallet.type,
      stationId: txn.fromWallet.stationId,
      stationName: txn.fromWallet.station?.name ?? null,
    },
    to: {
      walletId: txn.toWallet.id,
      type: txn.toWallet.type,
      stationId: txn.toWallet.stationId,
      stationName: txn.toWallet.station?.name ?? null,
    },
    failureCode: txn.status === TransactionStatus.FAILED ? txn.failureCode : null,
    failureMessage: resolveArabicFailureMessage(
      txn.status,
      txn.failureCode,
      txn.failureReason,
    ),
    verificationCode:
      isCompletedPayment && txn.verificationCode
        ? txn.verificationCode.trim()
        : null,
    createdAt: txn.createdAt.toISOString(),
    completedAt: txn.completedAt ? txn.completedAt.toISOString() : null,
  };
}

/**
 * Lists the authenticated user's transactions with opaque base64 cursor pagination
 * ordered by `(created_at DESC, id DESC)`.
 * Endpoint: GET /api/transactions?limit=20&cursor=&type=&status=
 */
export async function listTransactions(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const parsedQuery = listTransactionsQuerySchema.parse(req.query);
  const { limit, cursor, type, status } = parsedQuery;

  let decodedCursor: { createdAt: string; id: string } | undefined;
  if (cursor) {
    decodedCursor = decodeCursor(cursor);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedCursor.id)) {
      throw new AppError('VALIDATION_ERROR');
    }
  }

  const rows = await prisma.transaction.findMany({
    where: {
      userId: req.user.id,
      ...(type !== undefined ? { type } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: transactionHistoryInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(decodedCursor !== undefined
      ? { cursor: { id: decodedCursor.id }, skip: 1 }
      : {}),
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map(toHistoryItemDto);

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
 * Retrieves a single transaction by ID if owned by the caller (404 otherwise).
 * Endpoint: GET /api/transactions/:id
 */
export async function getTransactionById(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const id = String(req.params.id);

  const txn = await prisma.transaction.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
    include: transactionHistoryInclude,
  });

  if (!txn) {
    throw new AppError('NOT_FOUND');
  }

  res.status(200).json({
    data: toHistoryItemDto(txn),
  });
}

/**
 * Returns the paginated ledger statement for a wallet owned by the caller (404 otherwise).
 * Ordered by `(created_at DESC, id DESC)` with an opaque base64 cursor.
 * Endpoint: GET /api/wallets/:id/ledger?limit=&cursor=
 */
export async function getWalletLedger(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED');
  }

  const walletId = String(req.params.id);
  const { limit, cursor } = walletLedgerQuerySchema.parse(req.query);

  let decodedCursorId: bigint | undefined;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!/^\d+$/.test(decoded.id)) {
      throw new AppError('VALIDATION_ERROR');
    }
    decodedCursorId = BigInt(decoded.id);
  }

  const ownedWallet = await walletRepository.getOwnedWallet(
    req.user.id,
    walletId,
  );

  if (
    !ownedWallet ||
    (ownedWallet.type !== WalletType.USER_MAIN &&
      ownedWallet.type !== WalletType.USER_STATION)
  ) {
    throw new AppError('NOT_FOUND');
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      walletId: ownedWallet.id,
    },
    include: {
      transaction: {
        select: {
          id: true,
          seq: true,
          type: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(decodedCursorId !== undefined
      ? { cursor: { id: decodedCursorId }, skip: 1 }
      : {}),
    take: limit + 1,
  });

  const hasMore = entries.length > limit;
  const pageEntries = hasMore ? entries.slice(0, limit) : entries;

  const items: WalletLedgerEntryDto[] = pageEntries.map((entry) => {
    const ref = formatTxReference(entry.transaction.seq);
    return {
      id: String(entry.id),
      transactionId: entry.transactionId,
      reference: ref,
      transactionReference: ref,
      type: entry.transaction.type,
      delta: Number(entry.delta),
      balanceAfter: Number(entry.balanceAfter),
      createdAt: entry.createdAt.toISOString(),
    };
  });

  const lastEntry = pageEntries[pageEntries.length - 1];
  const nextCursor =
    hasMore && lastEntry
      ? encodeCursor({
          createdAt: lastEntry.createdAt.toISOString(),
          id: String(lastEntry.id),
        })
      : null;

  res.status(200).json({
    data: {
      items,
      nextCursor,
    },
  });
}

import { clerkClient, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { logger } from '../utils/logger.js';

export interface ClerkProfileInfo {
  fullName: string | null;
  phone: string | null;
}

export type ClerkProfileFetcher = (clerkUserId: string) => Promise<ClerkProfileInfo>;

/**
 * Default Clerk profile fetcher using `clerkClient.users.getUser`.
 */
export async function fetchClerkProfile(clerkUserId: string): Promise<ClerkProfileInfo> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const joinedName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const fullName = clerkUser.fullName?.trim() || joinedName || null;
    const primaryPhone =
      clerkUser.phoneNumbers?.find(
        (p: { id?: string; phoneNumber?: string }) =>
          p.id === clerkUser.primaryPhoneNumberId,
      ) ?? clerkUser.phoneNumbers?.[0];
    const phone = primaryPhone?.phoneNumber ?? null;
    return { fullName, phone };
  } catch {
    return { fullName: null, phone: null };
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return true;
  }
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Core idempotent logic to ensure a User row and its USER_MAIN wallet exist for `clerkUserId`.
 * Safe under concurrent first-time requests.
 */
export async function ensureUserByClerkId(
  clerkUserId: string,
  profileFetcher: ClerkProfileFetcher = fetchClerkProfile,
): Promise<Pick<User, 'id' | 'role' | 'status' | 'operatorStationId'>> {
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true, status: true, operatorStationId: true },
  });

  if (!user) {
    const { fullName, phone } = await profileFetcher(clerkUserId);
    try {
      user = await prisma.user.create({
        data: {
          clerkUserId,
          fullName,
          phone,
        },
        select: { id: true, role: true, status: true, operatorStationId: true },
      });
      logger.info('Auth', 'Provisioned new user and USER_MAIN wallet', {
        userId: user.id,
        clerkUserId,
        role: user.role,
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        user = await prisma.user.findUnique({
          where: { clerkUserId },
          select: { id: true, role: true, status: true, operatorStationId: true },
        });
      } else {
        throw err;
      }
    }
  }

  if (!user) {
    throw new AppError('INTERNAL');
  }

  await prisma.$executeRaw`
    INSERT INTO "wallets" ("type", "user_id", "balance")
    VALUES ('USER_MAIN'::"WalletType", ${user.id}::uuid, 0)
    ON CONFLICT ("user_id") WHERE "type" = 'USER_MAIN'
    DO NOTHING
  `;

  return user;
}

/**
 * Express middleware that ensures the authenticated Clerk user and their USER_MAIN wallet
 * exist in PostgreSQL, then attaches `req.user = { id, role, status }`.
 * Note: FROZEN users are allowed through here so they can still read; write services enforce the frozen check.
 */
export async function ensureUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    throw new AppError('UNAUTHENTICATED');
  }

  const user = await ensureUserByClerkId(clerkUserId);
  req.user = {
    id: user.id,
    role: user.role,
    status: user.status,
    operatorStationId: user.operatorStationId,
  };

  next();
}

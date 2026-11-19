import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { ERROR_CATALOG } from '../errors/catalog.js';
import { logger } from '../utils/logger.js';

let expireInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Sets PENDING transactions older than `timeoutSeconds` (default `PENDING_TIMEOUT_SECONDS`)
 * to `FAILED` with `failure_code = 'TIMEOUT'`.
 */
export async function expirePendingTransactions(
  timeoutSeconds: number = env.PENDING_TIMEOUT_SECONDS,
): Promise<number> {
  const affected = await prisma.$executeRaw`
    UPDATE "transactions"
    SET
      "status" = 'FAILED'::"TransactionStatus",
      "failure_code" = 'TIMEOUT',
      "failure_reason" = ${ERROR_CATALOG.TIMEOUT.message},
      "completed_at" = NOW()
    WHERE "status" = 'PENDING'::"TransactionStatus"
      AND "created_at" < NOW() - (${timeoutSeconds} * INTERVAL '1 second')
  `;

  const count = Number(affected);
  if (count > 0) {
    logger.warn('ExpirePendingJob', `Expired ${count} stale PENDING transaction(s)`, {
      expiredCount: count,
      timeoutSeconds,
    });
  }

  return count;
}

/**
 * Starts the 30-second periodic job to expire stale PENDING transactions (`interval.unref()`).
 */
export function startExpirePendingJob(
  intervalMs = 30_000,
): ReturnType<typeof setInterval> {
  if (expireInterval) {
    return expireInterval;
  }

  logger.info('ExpirePendingJob', 'Started periodic pending-transaction expiration job', {
    intervalMs,
    timeoutSeconds: env.PENDING_TIMEOUT_SECONDS,
  });

  expireInterval = setInterval(() => {
    void expirePendingTransactions().catch((err) => {
      logger.error('ExpirePendingJob', 'Error expiring pending transactions', {
        error: err,
      });
    });
  }, intervalMs);

  expireInterval.unref();
  return expireInterval;
}

/**
 * Stops the periodic pending-transaction expiration timer on graceful shutdown.
 */
export function stopExpirePendingJob(): void {
  if (expireInterval) {
    clearInterval(expireInterval);
    expireInterval = null;
    logger.info('ExpirePendingJob', 'Stopped periodic pending-transaction expiration job');
  }
}

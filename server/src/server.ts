import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import {
  startExpirePendingJob,
  stopExpirePendingJob,
} from './jobs/expire-pending.job.js';
import { logger } from './utils/logger.js';

startExpirePendingJob();

const server = app.listen(env.PORT, () => {
  logger.info('Server', `Fuel Wallet server listening on http://localhost:${env.PORT}`, {
    port: env.PORT,
    env: env.NODE_ENV,
    swaggerDocs: `http://localhost:${env.PORT}/api-docs`,
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info('Server', `Received ${signal}. Shutting down gracefully...`, {
    signal,
  });
  stopExpirePendingJob();
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Server', 'Prisma client disconnected cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Server', 'Error disconnecting Prisma client', {
        error: err,
      });
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

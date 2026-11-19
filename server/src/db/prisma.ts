import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 6,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
});

export const prisma = new PrismaClient({
  adapter,
  log: [{ emit: 'event', level: 'query' }],
  transactionOptions: {
    maxWait: 60_000,
    timeout: 60_000,
  },
});

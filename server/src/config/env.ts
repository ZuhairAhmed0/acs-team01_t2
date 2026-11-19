import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (val: unknown): unknown =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

const envSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(3000)),
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'production', 'test']).default('development'),
  ),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SHADOW_DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  TOPUP_MIN: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(1000)),
  TOPUP_MAX: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(500000)),
  BANK_LATENCY_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().default(400),
  ),
  PENDING_TIMEOUT_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(60),
  ),
  CORS_ORIGIN: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env: Env = parsed.data;

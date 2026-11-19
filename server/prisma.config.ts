import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const rawUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || '';
const withoutChannelBinding = rawUrl
  ? rawUrl
      .replace(/([?&])channel_binding=require(&|$)/, '$1')
      .replace(/[?&]$/, '')
  : '';
const cliUrl = withoutChannelBinding
  ? (withoutChannelBinding.includes('connect_timeout=')
      ? withoutChannelBinding
      : `${withoutChannelBinding}${withoutChannelBinding.includes('?') ? '&' : '?'}connect_timeout=60`)
  : 'postgresql://postgres:postgres@localhost:5432/fuel_wallet';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: cliUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL?.trim() || undefined,
  },
});


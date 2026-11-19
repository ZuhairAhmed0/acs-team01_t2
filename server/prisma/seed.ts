import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, WalletType } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required to run seed.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_STATIONS: ReadonlyArray<{ name: string; city: string }> = [
  { name: 'محطة النيل', city: 'أم درمان' },
  { name: 'محطة الأمل', city: 'الخرطوم' },
  { name: 'محطة السلام', city: 'بحري' },
  { name: 'محطة الوحدة', city: 'أم درمان' },
];

async function main(): Promise<void> {
  // 1. Single BANK_SIM wallet (uniqueness is enforced via partial index ux_wallet_single_bank)
  const existingBankWallet = await prisma.wallet.findFirst({
    where: { type: WalletType.BANK_SIM },
  });

  if (!existingBankWallet) {
    await prisma.wallet.create({
      data: {
        type: WalletType.BANK_SIM,
        balance: 0n,
      },
    });
  }

  // 2. system_settings: bank_gateway_status = "UP"
  await prisma.systemSetting.upsert({
    where: { key: 'bank_gateway_status' },
    update: { value: 'UP' },
    create: { key: 'bank_gateway_status', value: 'UP' },
  });

  // 3. 4 stations, each with exactly one STATION_REVENUE wallet
  for (const stationData of SEED_STATIONS) {
    const station = await prisma.station.upsert({
      where: {
        name_city: {
          name: stationData.name,
          city: stationData.city,
        },
      },
      update: {},
      create: {
        name: stationData.name,
        city: stationData.city,
      },
    });

    const existingRevenueWallet = await prisma.wallet.findFirst({
      where: {
        type: WalletType.STATION_REVENUE,
        stationId: station.id,
      },
    });

    if (!existingRevenueWallet) {
      await prisma.wallet.create({
        data: {
          type: WalletType.STATION_REVENUE,
          stationId: station.id,
          balance: 0n,
        },
      });
    }
  }

  console.log('Database seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


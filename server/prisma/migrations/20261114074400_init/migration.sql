-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'FROZEN');

-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('BANK_SIM', 'USER_MAIN', 'USER_STATION', 'STATION_REVENUE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'PAYMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "congestion" "CongestionLevel" NOT NULL DEFAULT 'LOW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerk_user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "operator_station_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "WalletType" NOT NULL,
    "user_id" UUID,
    "station_id" UUID,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seq" SERIAL NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" UUID NOT NULL,
    "from_wallet_id" UUID NOT NULL,
    "to_wallet_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "verification_code" CHAR(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "delta" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_name_city_key" ON "stations"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_station_id_idx" ON "wallets"("station_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_seq_key" ON "transactions"("seq");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_idempotency_key_key" ON "transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_created_at_idx" ON "ledger_entries"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_transaction_id_wallet_id_key" ON "ledger_entries"("transaction_id", "wallet_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_operator_station_id_fkey" FOREIGN KEY ("operator_station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Wallet shape per type
ALTER TABLE "wallets" ADD CONSTRAINT chk_wallet_owner CHECK (
  ("type" = 'USER_MAIN'       AND "user_id" IS NOT NULL AND "station_id" IS NULL) OR
  ("type" = 'USER_STATION'    AND "user_id" IS NOT NULL AND "station_id" IS NOT NULL) OR
  ("type" = 'STATION_REVENUE' AND "user_id" IS NULL     AND "station_id" IS NOT NULL) OR
  ("type" = 'BANK_SIM'        AND "user_id" IS NULL     AND "station_id" IS NULL)
);
-- Last line of defence: no negative balances (except the simulated bank)
ALTER TABLE "wallets" ADD CONSTRAINT chk_wallet_balance CHECK ("type" = 'BANK_SIM' OR "balance" >= 0);

CREATE UNIQUE INDEX ux_wallet_main_per_user       ON "wallets"("user_id")              WHERE "type" = 'USER_MAIN';
CREATE UNIQUE INDEX ux_wallet_station_per_user    ON "wallets"("user_id","station_id") WHERE "type" = 'USER_STATION';
CREATE UNIQUE INDEX ux_wallet_revenue_per_station ON "wallets"("station_id")           WHERE "type" = 'STATION_REVENUE';
CREATE UNIQUE INDEX ux_wallet_single_bank         ON "wallets"("type")                 WHERE "type" = 'BANK_SIM';

ALTER TABLE "transactions" ADD CONSTRAINT chk_txn_amount CHECK ("amount" > 0);
ALTER TABLE "transactions" ADD CONSTRAINT chk_txn_diff_wallets CHECK ("from_wallet_id" <> "to_wallet_id");
ALTER TABLE "transactions" ADD CONSTRAINT chk_txn_failed_code CHECK ("status" <> 'FAILED' OR "failure_code" IS NOT NULL);
ALTER TABLE "ledger_entries" ADD CONSTRAINT chk_ledger_delta CHECK ("delta" <> 0);

-- Ledger is append-only
CREATE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'ledger_entries is append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_ledger_immutable
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

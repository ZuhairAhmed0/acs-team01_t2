/**
 * Exact Backend API Contract Types (Mirroring Express + Prisma Backend DTOs).
 *
 * All monetary amounts (`balance`, `amount`, `delta`, `balanceAfter`, `totalAmount`)
 * are returned by the backend as safe whole SDG integers (`number`).
 */

export type UserRole = 'DRIVER' | 'OPERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'FROZEN';
export type CongestionLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type WalletType =
  | 'BANK_SIM'
  | 'USER_MAIN'
  | 'USER_STATION'
  | 'STATION_REVENUE';
export type TransactionType = 'TOPUP' | 'PAYMENT' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type BankGatewayStatus = 'UP' | 'DOWN';

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface StationWalletSummaryDto {
  walletId: string;
  walletNumber?: number;
  stationId: string;
  stationName: string;
  balance: number;
}

export interface MeResponseDto {
  user: {
    id: string;
    fullName: string | null;
    role: UserRole;
    status: UserStatus;
    operatorStationId?: string | null;
  };
  wallets: {
    main: {
      id: string;
      walletNumber?: number;
      balance: number;
    };
    stations: StationWalletSummaryDto[];
  };
  totalBalance: number;
}

export interface CreateStationInputDto {
  name: string;
  city: string;
  address?: string | null;
  congestion?: CongestionLevel;
  isActive?: boolean;
}

export interface UpdateStationInputDto {
  name?: string;
  city?: string;
  address?: string | null;
  congestion?: CongestionLevel;
  isActive?: boolean;
}

export interface StationDto {
  id: string;
  name: string;
  city: string;
  address: string | null;
  isActive: boolean;
  congestion: CongestionLevel;
  myStationWalletId: string | null;
  myStationBalance: number;
  mainBalance: number;
  availableHere: number;
}

export interface TransactionDto {
  id: string;
  seq: number;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  idempotencyKey: string;
  failureCode: string | null;
  failureReason: string | null;
  verificationCode: string | null;
  balanceAfter: {
    from: number | null;
    to: number | null;
  };
  fromBalanceAfter: number | null;
  toBalanceAfter: number | null;
  createdAt: string;
  completedAt: string | null;
}

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

export interface PaginatedResponseDto<T> {
  items: T[];
  nextCursor: string | null;
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

export interface ReconciliationIssueDto {
  kind:
    | 'WALLET_BALANCE_MISMATCH'
    | 'TXN_LEDGER_IMBALANCE'
    | 'NON_COMPLETED_TXN_HAS_LEDGER'
    | 'SYSTEM_BALANCE_SUM_NON_ZERO';
  entityId?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ReconciliationReportDto {
  ok: boolean;
  checkedAt: string;
  issues: ReconciliationIssueDto[];
}


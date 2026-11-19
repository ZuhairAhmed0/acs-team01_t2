import { useState } from 'react';
import { useLanguage } from '../../app/providers/LanguageProvider.js';
import { useTransactionDetailQuery } from '../../features/transactions/hooks/useTransactions.js';
import { extractApiError } from '../../lib/axios.js';
import { formatDateTime, formatMoney } from '../../lib/format.js';
import type { WalletEndpointInfoDto } from '../../types/api.types.js';
import { Button } from '../ui/Button.js';
import { CopyIcon, RefreshCwIcon } from '../ui/Icons.js';
import { Modal } from '../ui/Modal.js';
import { ErrorState } from './ErrorState.js';
import { LoadingState } from './LoadingState.js';
import {
  TransactionStatusBadge,
  TransactionTypeBadge,
} from './StatusBadge.js';

function formatEndpointLabel(
  endpoint: WalletEndpointInfoDto,
  lang: 'ar' | 'en',
): string {
  if (endpoint.type === 'BANK_SIM') {
    return lang === 'ar' ? 'بوابة البنك (BANK_SIM)' : 'Bank Gateway (BANK_SIM)';
  }
  if (endpoint.type === 'USER_MAIN') {
    return lang === 'ar'
      ? 'المحفظة الرئيسية (USER_MAIN)'
      : 'Main Wallet (USER_MAIN)';
  }
  if (endpoint.type === 'USER_STATION') {
    return endpoint.stationName
      ? `${lang === 'ar' ? 'محفظة محطة' : 'Station Wallet'}: ${endpoint.stationName}`
      : 'USER_STATION';
  }
  if (endpoint.type === 'STATION_REVENUE') {
    return endpoint.stationName
      ? `${lang === 'ar' ? 'إيرادات محطة' : 'Station Revenue'}: ${endpoint.stationName}`
      : 'STATION_REVENUE';
  }
  return endpoint.type;
}

export interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailModal({
  transactionId,
  onClose,
}: TransactionDetailModalProps) {
  const { t, lang } = useLanguage();
  const detailQuery = useTransactionDetailQuery(transactionId);
  const [copiedCode, setCopiedCode] = useState(false);

  const txn = detailQuery.data;

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <Modal
      isOpen={Boolean(transactionId)}
      onClose={onClose}
      title={t.transactions.detailsTitle}
    >
      {detailQuery.isLoading ? (
        <LoadingState />
      ) : detailQuery.isError ? (
        <ErrorState
          message={extractApiError(detailQuery.error).message}
          onRetry={() => {
            void detailQuery.refetch();
          }}
        />
      ) : txn ? (
        <div className="space-y-4">
          {/* Header Amount & Badges */}
          <div className="rounded-2xl border border-surface-border bg-surface-elevated p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <TransactionTypeBadge type={txn.type} />
              <TransactionStatusBadge status={txn.status} />
            </div>
            <p className="text-2xl font-extrabold font-mono text-content-primary">
              {formatMoney(txn.amount, lang)}
            </p>
            <p className="text-xs font-mono text-content-secondary">
              {txn.reference} • {txn.id}
            </p>
          </div>

          {/* 6-Digit Verification Code for Completed Payments */}
          {txn.verificationCode && (
            <div className="rounded-2xl border-2 border-brand-primary/50 bg-brand-primary/10 p-4 text-center space-y-2">
              <p className="text-xs font-bold text-brand-primary">
                {t.payment.verificationCodeLabel}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-extrabold tracking-[0.25em] text-content-primary">
                  {txn.verificationCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyCode(txn.verificationCode!)}
                  leftIcon={<CopyIcon size={14} />}
                >
                  {copiedCode ? t.common.copied : t.common.copy}
                </Button>
              </div>
              <p className="text-[11px] text-content-secondary">
                {t.payment.verificationCodeHint}
              </p>
            </div>
          )}

          {/* Failure Message (Arabic from Backend Catalog) */}
          {txn.status === 'FAILED' && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 space-y-1">
              <p className="font-bold">
                {t.transactions.failureReason}: {txn.failureCode || 'FAILED'}
              </p>
              <p>{txn.failureMessage}</p>
            </div>
          )}

          {/* Endpoint Details */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-4 text-xs sm:text-sm space-y-2.5">
            <div className="flex justify-between gap-4">
              <span className="text-content-secondary">
                {t.transactions.fromWallet}:
              </span>
              <span className="font-semibold text-content-primary text-end">
                {formatEndpointLabel(txn.from, lang)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-content-secondary">
                {t.transactions.toWallet}:
              </span>
              <span className="font-semibold text-content-primary text-end">
                {formatEndpointLabel(txn.to, lang)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-content-secondary">
                {t.transactions.createdAt}:
              </span>
              <span className="font-mono text-content-primary">
                {formatDateTime(txn.createdAt, lang)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-content-secondary">
                {t.transactions.completedAt}:
              </span>
              <span className="font-mono text-content-primary">
                {formatDateTime(txn.completedAt, lang)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={detailQuery.isFetching}
              onClick={() => {
                void detailQuery.refetch();
              }}
              leftIcon={<RefreshCwIcon size={14} />}
            >
              {t.transactions.pollStatus}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              {t.common.close}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}


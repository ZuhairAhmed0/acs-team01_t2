import { useMemo, useState } from 'react';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import { ErrorState } from '../../../components/shared/ErrorState.js';
import { LoadingState } from '../../../components/shared/LoadingState.js';
import {
  TransactionStatusBadge,
  TransactionTypeBadge,
} from '../../../components/shared/StatusBadge.js';
import { TransactionDetailModal } from '../../../components/shared/TransactionDetailModal.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { HistoryIcon, RefreshCwIcon } from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatDateTime, formatMoney } from '../../../lib/format.js';
import type {
  TransactionStatus,
  TransactionType,
} from '../../../types/api.types.js';
import { useTransactionsQuery } from '../hooks/useTransactions.js';

export function TransactionsPage() {
  const { t, lang } = useLanguage();

  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const txnsQuery = useTransactionsQuery({
    limit: 20,
    cursor,
    type: (typeFilter || undefined) as TransactionType | undefined,
    status: (statusFilter || undefined) as TransactionStatus | undefined,
  });

  const filteredItems = useMemo(() => {
    const items = txnsQuery.data?.items ?? [];
    if (!dateFilter) return items;
    return items.filter((item) => item.createdAt.startsWith(dateFilter));
  }, [txnsQuery.data?.items, dateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
            {t.transactions.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            {t.transactions.subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void txnsQuery.refetch();
          }}
          leftIcon={<RefreshCwIcon size={15} />}
        >
          {t.transactions.pollStatus}
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label={lang === 'ar' ? 'نوع العملية' : 'Transaction Type'}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCursor(undefined);
          }}
          options={[
            { value: '', label: t.transactions.allTypes },
            { value: 'TOPUP', label: t.transactions.type_TOPUP },
            { value: 'PAYMENT', label: t.transactions.type_PAYMENT },
            { value: 'TRANSFER', label: t.transactions.type_TRANSFER },
          ]}
        />
        <Select
          label={lang === 'ar' ? 'حالة العملية' : 'Status'}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCursor(undefined);
          }}
          options={[
            { value: '', label: t.transactions.allStatuses },
            { value: 'COMPLETED', label: t.transactions.status_COMPLETED },
            { value: 'PENDING', label: t.transactions.status_PENDING },
            { value: 'FAILED', label: t.transactions.status_FAILED },
          ]}
        />
        <Input
          label={lang === 'ar' ? 'تصفية بالتاريخ' : 'Filter by Date'}
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </Card>

      {txnsQuery.isLoading ? (
        <LoadingState />
      ) : txnsQuery.isError ? (
        <ErrorState
          message={extractApiError(txnsQuery.error).message}
          onRetry={() => {
            void txnsQuery.refetch();
          }}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={24} />}
          title={t.dashboard.noRecentTxns}
        />
      ) : (
        <Card noPadding className="overflow-hidden">
          <div className="divide-y divide-surface-border">
            {filteredItems.map((txn) => (
              <button
                key={txn.id}
                type="button"
                onClick={() => setSelectedTxnId(txn.id)}
                className="flex w-full flex-col justify-between gap-3 p-4 text-start hover:bg-surface-elevated transition-colors sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-content-primary">
                      {txn.reference}
                    </span>
                    <TransactionTypeBadge type={txn.type} />
                    <TransactionStatusBadge status={txn.status} />
                    {txn.verificationCode && (
                      <span className="rounded-md bg-brand-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-brand-primary">
                        Code: {txn.verificationCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-content-secondary">
                    {formatDateTime(txn.createdAt, lang)}
                    {txn.from.stationName
                      ? ` • ${lang === 'ar' ? 'من' : 'From'}: ${txn.from.stationName}`
                      : ''}
                    {txn.to.stationName
                      ? ` • ${lang === 'ar' ? 'إلى' : 'To'}: ${txn.to.stationName}`
                      : ''}
                  </p>
                  {txn.status === 'FAILED' && txn.failureMessage && (
                    <p className="text-xs font-medium text-red-500">
                      {txn.failureCode}: {txn.failureMessage}
                    </p>
                  )}
                </div>

                <div className="text-start sm:text-end">
                  <p className="font-mono text-base font-extrabold text-content-primary">
                    {formatMoney(txn.amount, lang)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-surface-border bg-surface-elevated/50 px-4 py-3">
            {cursor ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(undefined)}
              >
                {lang === 'ar' ? 'العودة للصفحة الأولى' : 'Back to First Page'}
              </Button>
            ) : (
              <span />
            )}
            {txnsQuery.data?.nextCursor && (
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  setCursor(txnsQuery.data?.nextCursor ?? undefined)
                }
              >
                {t.transactions.loadMore}
              </Button>
            )}
          </div>
        </Card>
      )}

      <TransactionDetailModal
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
      />
    </div>
  );
}


import { useState } from 'react';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import { ErrorState } from '../../../components/shared/ErrorState.js';
import { LoadingState } from '../../../components/shared/LoadingState.js';
import { TransactionTypeBadge } from '../../../components/shared/StatusBadge.js';
import { Button } from '../../../components/ui/Button.js';
import { Modal } from '../../../components/ui/Modal.js';
import { extractApiError } from '../../../lib/axios.js';
import {
  formatDateTime,
  formatMoney,
  formatSignedDelta,
} from '../../../lib/format.js';
import { useWalletLedgerQuery } from '../hooks/useWalletMutations.js';

export interface WalletStatementModalProps {
  walletId: string | null;
  walletTitle: string;
  onClose: () => void;
}

export function WalletStatementModal({
  walletId,
  walletTitle,
  onClose,
}: WalletStatementModalProps) {
  const { t, lang } = useLanguage();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const ledgerQuery = useWalletLedgerQuery(walletId, cursor);

  const handleClose = () => {
    setCursor(undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(walletId)}
      onClose={handleClose}
      title={`${t.wallet.statementModalTitle} — ${walletTitle}`}
      maxWidthClass="max-w-2xl"
    >
      {ledgerQuery.isLoading ? (
        <LoadingState />
      ) : ledgerQuery.isError ? (
        <ErrorState
          message={extractApiError(ledgerQuery.error).message}
          onRetry={() => {
            void ledgerQuery.refetch();
          }}
        />
      ) : !ledgerQuery.data || ledgerQuery.data.items.length === 0 ? (
        <EmptyState title={t.wallet.noLedgerEntries} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-surface-elevated text-content-secondary border-b border-surface-border">
                <tr>
                  <th className="px-3.5 py-2.5 text-start font-semibold">
                    {t.wallet.reference}
                  </th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">
                    {t.wallet.delta}
                  </th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">
                    {t.wallet.balanceAfter}
                  </th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">
                    {t.wallet.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ledgerQuery.data.items.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-surface-elevated/60 transition-colors"
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-content-primary">
                          {entry.reference}
                        </span>
                        <TransactionTypeBadge type={entry.type} />
                      </div>
                    </td>
                    <td
                      className={`px-3.5 py-2.5 font-mono font-bold ${
                        entry.delta >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {formatSignedDelta(entry.delta, lang)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-semibold text-content-primary">
                      {formatMoney(entry.balanceAfter, lang)}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-content-secondary">
                      {formatDateTime(entry.createdAt, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            {cursor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(undefined)}
              >
                {lang === 'ar' ? 'الصفحة الأولى' : 'First Page'}
              </Button>
            )}
            {ledgerQuery.data.nextCursor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCursor(ledgerQuery.data?.nextCursor ?? undefined)
                }
              >
                {t.transactions.loadMore}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}


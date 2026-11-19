import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import {
  CongestionBadge,
  TransactionStatusBadge,
  TransactionTypeBadge,
} from '../../../components/shared/StatusBadge.js';
import { TransactionDetailModal } from '../../../components/shared/TransactionDetailModal.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  ArrowLeftRightIcon,
  FuelIcon,
  HistoryIcon,
  PlusCircleIcon,
  ReceiptIcon,
  WalletIcon,
} from '../../../components/ui/Icons.js';
import {
  formatDateTime,
  formatMoney,
  formatWalletNumber,
} from '../../../lib/format.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { useStationsQuery } from '../../stations/hooks/useStations.js';
import { useTransactionsQuery } from '../../transactions/hooks/useTransactions.js';
import { TopUpModal } from '../../wallet/components/TopUpModal.js';

export function DashboardPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { user, wallets, totalBalance } = useCurrentUser();
  const stationsQuery = useStationsQuery();
  const recentTxnsQuery = useTransactionsQuery({ limit: 6 });

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const mainBalance = wallets?.main.balance ?? 0;
  const stationWallets = wallets?.stations ?? [];
  const allocatedTotal = stationWallets.reduce((acc, w) => acc + w.balance, 0);
  const isFrozen = user?.status === 'FROZEN';

  return (
    <div className="space-y-6">
      {/* Trust Wallet-Inspired Hero Balance Card */}
      <Card variant="hero" className="relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100/90">
                {t.dashboard.totalBalance}
              </span>
              {user && (
                <Badge tone="info" className="bg-white/15 text-white border-white/25">
                  {t.roles[user.role]}
                </Badge>
              )}
            </div>
            <p className="font-mono text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {formatMoney(totalBalance, lang)}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-blue-100/90">
              <span>
                {t.dashboard.mainWallet}:{' '}
                <strong className="font-mono text-white">
                  {formatMoney(mainBalance, lang)}
                </strong>
              </span>
              <span>•</span>
              <span>
                {t.dashboard.allocatedTotal}:{' '}
                <strong className="font-mono text-white">
                  {formatMoney(allocatedTotal, lang)}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Button
              variant="primary"
              disabled={isFrozen}
              onClick={() => setIsTopUpOpen(true)}
              leftIcon={<PlusCircleIcon size={17} />}
              className="bg-white/15 hover:bg-white/25 text-slate-900 hover:bg-blue-50"
            >
              {t.dashboard.topUp}
            </Button>
            <Button
              variant="primary"
              disabled={isFrozen}
              onClick={() => navigate('/pay')}
              leftIcon={<ReceiptIcon size={17} />}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              {t.dashboard.payFuel}
            </Button>
            <Button
              variant="primary"
              disabled={isFrozen}
              onClick={() => navigate('/transfer')}
              leftIcon={<ArrowLeftRightIcon size={17} />}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              {t.dashboard.transferBalance}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/stations')}
              leftIcon={<FuelIcon size={17} />}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              {t.dashboard.viewStations}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Wallets & Participating Stations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Allocated Station Wallets */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon size={19} className="text-brand-primary" />
              <h2 className="text-base font-bold text-content-primary">
                {t.dashboard.stationWallets}
              </h2>
            </div>
            <Link
              to="/wallets"
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              {t.dashboard.viewAll}
            </Link>
          </div>

          {stationWallets.length === 0 ? (
            <EmptyState
              icon={<WalletIcon size={22} />}
              title={t.dashboard.noStationWallets}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isFrozen}
                  onClick={() => navigate('/transfer')}
                >
                  {t.dashboard.transferBalance}
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {stationWallets.map((sw) => (
                <div
                  key={sw.walletId}
                  className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-elevated p-3.5"
                >
                  <div>
                    <p className="text-sm font-bold text-content-primary">
                      {sw.stationName}
                    </p>
                    <p className="text-[11px] font-mono text-content-muted">
                      #{formatWalletNumber(sw.walletId, sw.walletNumber)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-extrabold text-brand-primary">
                      {formatMoney(sw.balance, lang)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isFrozen}
                      onClick={() =>
                        navigate(`/pay?stationId=${sw.stationId}&walletId=${sw.walletId}`)
                      }
                    >
                      {t.dashboard.payFuel}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Participating Fuel Stations Preview */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FuelIcon size={19} className="text-brand-primary" />
              <h2 className="text-base font-bold text-content-primary">
                {t.dashboard.availableStations}
              </h2>
            </div>
            <Link
              to="/stations"
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              {t.dashboard.viewAll}
            </Link>
          </div>

          <div className="space-y-2.5">
            {(stationsQuery.data ?? []).slice(0, 4).map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-elevated p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-content-primary">
                      {st.name}
                    </span>
                    <Badge tone={st.isActive ? 'success' : 'danger'}>
                      {st.isActive ? t.stations.active : t.stations.inactive}
                    </Badge>
                  </div>
                  <p className="text-xs text-content-secondary">
                    {st.city} {st.address ? `• ${st.address}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <CongestionBadge level={st.congestion} />
                  <span className="text-[11px] text-content-secondary">
                    {t.stations.availableHere}:{' '}
                    <strong className="font-mono text-content-primary">
                      {formatMoney(st.availableHere, lang)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryIcon size={19} className="text-brand-primary" />
            <h2 className="text-base font-bold text-content-primary">
              {t.dashboard.recentTransactions}
            </h2>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            {t.dashboard.viewAll}
          </Link>
        </div>

        {!recentTxnsQuery.data || recentTxnsQuery.data.items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon size={22} />}
            title={t.dashboard.noRecentTxns}
          />
        ) : (
          <div className="divide-y divide-surface-border rounded-xl border border-surface-border overflow-hidden">
            {recentTxnsQuery.data.items.map((txn) => (
              <button
                key={txn.id}
                type="button"
                onClick={() => setSelectedTxnId(txn.id)}
                className="flex w-full items-center justify-between gap-4 bg-surface-card px-4 py-3 text-start hover:bg-surface-elevated transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-content-primary">
                      {txn.reference}
                    </span>
                    <TransactionTypeBadge type={txn.type} />
                    <TransactionStatusBadge status={txn.status} />
                  </div>
                  <p className="text-xs text-content-secondary">
                    {formatDateTime(txn.createdAt, lang)}
                    {txn.to.stationName ? ` • ${txn.to.stationName}` : ''}
                    {txn.failureMessage ? ` • ${txn.failureMessage}` : ''}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-mono text-sm font-extrabold text-content-primary">
                    {formatMoney(txn.amount, lang)}
                  </p>
                  {txn.verificationCode && (
                    <span className="inline-block rounded bg-brand-primary/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-primary">
                      #{txn.verificationCode}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
      />

      <TransactionDetailModal
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
      />
    </div>
  );
}


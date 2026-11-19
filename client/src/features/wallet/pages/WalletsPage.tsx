import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  ArrowLeftRightIcon,
  HistoryIcon,
  PlusCircleIcon,
  ReceiptIcon,
  WalletIcon,
} from '../../../components/ui/Icons.js';
import { formatMoney, formatWalletNumber } from '../../../lib/format.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { TopUpModal } from '../components/TopUpModal.js';
import { WalletStatementModal } from '../components/WalletStatementModal.js';

export function WalletsPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { user, wallets, totalBalance } = useCurrentUser();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [statementTarget, setStatementTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const mainWallet = wallets?.main;
  const stationWallets = wallets?.stations ?? [];
  const isFrozen = user?.status === 'FROZEN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
            {t.wallet.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            {t.wallet.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            disabled={isFrozen}
            onClick={() => setIsTopUpOpen(true)}
            leftIcon={<PlusCircleIcon size={17} />}
          >
            {t.dashboard.topUp}
          </Button>
          <Button
            variant="outline"
            disabled={isFrozen}
            onClick={() => navigate('/transfer')}
            leftIcon={<ArrowLeftRightIcon size={17} />}
          >
            {t.dashboard.transferBalance}
          </Button>
        </div>
      </div>

      {/* Main Wallet Card */}
      {mainWallet && (
        <Card variant="elevated" className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge tone="info">USER_MAIN</Badge>
                <h2 className="text-base font-bold text-content-primary">
                  {t.wallet.mainWalletTitle}
                </h2>
              </div>
              <p className="text-xs text-content-secondary">
                {t.wallet.mainWalletDesc}
              </p>
              <p className="text-xs font-mono font-bold text-brand-primary">
                {lang === 'ar' ? 'رقم المحفظة:' : 'Wallet No:'} #
                {formatWalletNumber(mainWallet.id, mainWallet.walletNumber)}
              </p>
            </div>
            <div className="text-start sm:text-end">
              <p className="text-xs text-content-secondary">
                {t.dashboard.totalBalance}:{' '}
                <strong className="font-mono text-content-primary">
                  {formatMoney(totalBalance, lang)}
                </strong>
              </p>
              <p className="font-mono text-2xl font-extrabold text-brand-primary sm:text-3xl">
                {formatMoney(mainWallet.balance, lang)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-surface-border pt-4">
            <Button
              size="sm"
              variant="primary"
              disabled={isFrozen}
              onClick={() => setIsTopUpOpen(true)}
              leftIcon={<PlusCircleIcon size={15} />}
            >
              {t.dashboard.topUp}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isFrozen}
              onClick={() => navigate(`/transfer?fromWalletId=${mainWallet.id}`)}
              leftIcon={<ArrowLeftRightIcon size={15} />}
            >
              {t.dashboard.transferBalance}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setStatementTarget({
                  id: mainWallet.id,
                  title: t.wallet.mainWalletTitle,
                })
              }
              leftIcon={<HistoryIcon size={15} />}
            >
              {t.wallet.statementBtn}
            </Button>
          </div>
        </Card>
      )}

      {/* Allocated Station Wallets */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-content-primary">
          {t.wallet.stationWalletsTitle} ({stationWallets.length})
        </h2>

        {stationWallets.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={24} />}
            title={t.dashboard.noStationWallets}
            action={
              <Button
                variant="primary"
                size="sm"
                disabled={isFrozen}
                onClick={() => navigate('/transfer')}
                leftIcon={<ArrowLeftRightIcon size={15} />}
              >
                {t.dashboard.transferBalance}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {stationWallets.map((sw) => (
              <Card key={sw.walletId} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge tone="purple">USER_STATION</Badge>
                    <h3 className="mt-1.5 text-base font-bold text-content-primary">
                      {sw.stationName}
                    </h3>
                    <p className="text-xs font-mono font-semibold text-content-muted">
                      {lang === 'ar' ? 'رقم المحفظة:' : 'Wallet No:'} #
                      {formatWalletNumber(sw.walletId, sw.walletNumber)}
                    </p>
                  </div>
                  <p className="font-mono text-xl font-extrabold text-brand-primary">
                    {formatMoney(sw.balance, lang)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-surface-border pt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isFrozen}
                    onClick={() =>
                      navigate(
                        `/pay?stationId=${sw.stationId}&walletId=${sw.walletId}`,
                      )
                    }
                    leftIcon={<ReceiptIcon size={14} />}
                  >
                    {t.dashboard.payFuel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFrozen}
                    onClick={() =>
                      navigate(`/transfer?fromWalletId=${sw.walletId}`)
                    }
                    leftIcon={<ArrowLeftRightIcon size={14} />}
                  >
                    {t.dashboard.transferBalance}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStatementTarget({
                        id: sw.walletId,
                        title: sw.stationName,
                      })
                    }
                    leftIcon={<HistoryIcon size={14} />}
                  >
                    {t.wallet.statementBtn}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />

      <WalletStatementModal
        walletId={statementTarget?.id ?? null}
        walletTitle={statementTarget?.title ?? ''}
        onClose={() => setStatementTarget(null)}
      />
    </div>
  );
}


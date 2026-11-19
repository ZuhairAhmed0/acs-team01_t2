import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatMoney } from '../../../lib/format.js';
import { createIdempotencyKey } from '../../../lib/idempotency.js';
import type { TransactionDto } from '../../../types/api.types.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { useStationsQuery } from '../../stations/hooks/useStations.js';
import { useTransferMutation } from '../hooks/useTransferMutation.js';

export function TransferPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const { user, wallets } = useCurrentUser();
  const stationsQuery = useStationsQuery();
  const transferMutation = useTransferMutation();

  const mainWallet = wallets?.main;
  const stationWallets = useMemo(
    () => wallets?.stations ?? [],
    [wallets?.stations],
  );
  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);

  const [fromWalletId, setFromWalletId] = useState(
    () => searchParams.get('fromWalletId') || '',
  );
  const [destType, setDestType] = useState<'STATION' | 'MAIN'>('STATION');
  const [destStationId, setDestStationId] = useState(
    () => searchParams.get('toStationId') || '',
  );
  const [amountInput, setAmountInput] = useState('20000');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey('xfer'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [completedTransfer, setCompletedTransfer] =
    useState<TransactionDto | null>(null);

  const effectiveFromWalletId = fromWalletId || mainWallet?.id || '';

  const effectiveDestStationId = useMemo(() => {
    if (destStationId) return destStationId;
    const firstActive = stations.find((s) => s.isActive) ?? stations[0];
    return firstActive?.id ?? '';
  }, [destStationId, stations]);

  const sourceWalletOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; balance: number }> = [];
    if (mainWallet) {
      opts.push({
        value: mainWallet.id,
        label: `${t.wallet.mainWalletTitle} (${formatMoney(mainWallet.balance, lang)})`,
        balance: mainWallet.balance,
      });
    }
    for (const sw of stationWallets) {
      opts.push({
        value: sw.walletId,
        label: `${sw.stationName} (${formatMoney(sw.balance, lang)})`,
        balance: sw.balance,
      });
    }
    return opts;
  }, [mainWallet, stationWallets, t, lang]);

  const selectedSource = useMemo(
    () =>
      sourceWalletOptions.find((w) => w.value === effectiveFromWalletId) ??
      null,
    [sourceWalletOptions, effectiveFromWalletId],
  );

  const resetIdempotency = () => {
    setIdempotencyKey(createIdempotencyKey('xfer'));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setCompletedTransfer(null);

    const parsedAmount = Number(amountInput.trim());
    if (!effectiveFromWalletId) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى اختيار المحفظة المصدر'
          : 'Please select a source wallet',
      );
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال مبلغ صحيح موجب'
          : 'Please enter a positive integer amount',
      );
      return;
    }
    if (destType === 'STATION' && !effectiveDestStationId) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى اختيار المحطة المستقبِلة'
          : 'Please select a destination station',
      );
      return;
    }

    transferMutation.mutate(
      {
        fromWalletId: effectiveFromWalletId,
        to:
          destType === 'MAIN'
            ? { type: 'MAIN' }
            : { type: 'STATION', stationId: effectiveDestStationId },
        amount: parsedAmount,
        idempotencyKey,
      },
      {
        onSuccess: (dto) => {
          setCompletedTransfer(dto);
          resetIdempotency();
        },
        onError: () => {
          resetIdempotency();
        },
      },
    );
  };

  const apiError = transferMutation.isError
    ? extractApiError(transferMutation.error)
    : null;
  const isFrozen = user?.status === 'FROZEN';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
          {t.transfer.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          {t.transfer.subtitle}
        </p>
      </div>

      <Card className="space-y-5">
        {completedTransfer && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs sm:text-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-bold">
              <CheckCircleIcon size={18} />
              <span>{t.transfer.transferSuccess}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
              <div>
                <span className="text-content-secondary">
                  {t.wallet.reference}:{' '}
                </span>
                <strong className="font-mono text-content-primary">
                  {completedTransfer.reference}
                </strong>
              </div>
              {completedTransfer.balanceAfter.from !== null && (
                <div>
                  <span className="text-content-secondary">
                    {lang === 'ar' ? 'رصيد المصدر بعد:' : 'Source After:'}{' '}
                  </span>
                  <strong className="font-mono text-content-primary">
                    {formatMoney(completedTransfer.balanceAfter.from, lang)}
                  </strong>
                </div>
              )}
              {completedTransfer.balanceAfter.to !== null && (
                <div>
                  <span className="text-content-secondary">
                    {lang === 'ar' ? 'رصيد الوجهة بعد:' : 'Dest After:'}{' '}
                  </span>
                  <strong className="font-mono text-emerald-500">
                    {formatMoney(completedTransfer.balanceAfter.to, lang)}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label={t.transfer.sourceWallet}
            value={effectiveFromWalletId}
            onChange={(e) => {
              setFromWalletId(e.target.value);
              resetIdempotency();
            }}
            options={sourceWalletOptions.map((w) => ({
              value: w.value,
              label: w.label,
            }))}
          />

          <Select
            label={t.transfer.destinationType}
            value={destType}
            onChange={(e) => {
              setDestType(e.target.value as 'STATION' | 'MAIN');
              resetIdempotency();
            }}
            options={[
              { value: 'STATION', label: t.transfer.toStationWallet },
              { value: 'MAIN', label: t.transfer.toMainWallet },
            ]}
          />

          {destType === 'STATION' && (
            <Select
              label={t.transfer.destinationStation}
              value={effectiveDestStationId}
              onChange={(e) => {
                setDestStationId(e.target.value);
                resetIdempotency();
              }}
              options={stations.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.city}) — ${s.isActive ? t.stations.active : t.stations.inactive
                  }`,
              }))}
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-content-primary">
                {t.transfer.amountLabel}
              </span>
              {selectedSource && selectedSource.balance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmountInput(String(selectedSource.balance));
                    resetIdempotency();
                  }}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  {t.transfer.maxFullBalance} (
                  {formatMoney(selectedSource.balance, lang)})
                </button>
              )}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setValidationError(null);
                resetIdempotency();
              }}
              error={validationError}
              rightAdornment={
                <span className="text-xs font-bold">{t.currency}</span>
              }
            />
          </div>

          <p className="text-xs text-content-secondary">
            {t.transfer.inactiveSourceNote}
          </p>

          {/* <div className="flex items-center justify-between text-[11px] text-content-muted">
            <span>Idempotency-Key:</span>
            <Badge tone="neutral" className="font-mono text-[10px]">
              {idempotencyKey}
            </Badge>
          </div> */}

          {apiError && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500"
              role="alert"
            >
              <AlertTriangleIcon size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{apiError.code}</p>
                <p className="mt-0.5">{apiError.message}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isFrozen}
            isLoading={transferMutation.isPending}
            leftIcon={<ArrowLeftRightIcon size={18} />}
          >
            {t.transfer.submitTransfer}
          </Button>
        </form>
      </Card>
    </div>
  );
}

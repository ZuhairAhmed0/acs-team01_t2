import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { TransactionDetailModal } from '../../../components/shared/TransactionDetailModal.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CopyIcon,
  ReceiptIcon,
  RefreshCwIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatDateTime, formatMoney } from '../../../lib/format.js';
import { createIdempotencyKey } from '../../../lib/idempotency.js';
import type { TransactionDto } from '../../../types/api.types.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { useStationsQuery } from '../../stations/hooks/useStations.js';
import { useTransactionsQuery } from '../../transactions/hooks/useTransactions.js';
import { usePaymentMutation } from '../hooks/usePaymentMutation.js';

export function PaymentPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const { user, wallets } = useCurrentUser();
  const stationsQuery = useStationsQuery();
  const recentPaymentsQuery = useTransactionsQuery({
    type: 'PAYMENT',
    limit: 5,
  });
  const paymentMutation = usePaymentMutation();

  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);
  const mainWallet = wallets?.main;
  const stationWallets = useMemo(
    () => wallets?.stations ?? [],
    [wallets?.stations],
  );

  const [stationId, setStationId] = useState(
    () => searchParams.get('stationId') || '',
  );
  const [sourceWalletId, setSourceWalletId] = useState(
    () => searchParams.get('walletId') || '',
  );
  const [amountInput, setAmountInput] = useState('12000');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey('pay'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [completedPayment, setCompletedPayment] =
    useState<TransactionDto | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inspectTxnId, setInspectTxnId] = useState<string | null>(null);

  // Compute effective station & source wallet during render (avoiding cascading useEffect setState)
  const effectiveStationId = useMemo(() => {
    if (stationId) return stationId;
    const firstActive = stations.find((s) => s.isActive) ?? stations[0];
    return firstActive?.id ?? '';
  }, [stationId, stations]);

  const effectiveSourceWalletId = useMemo(() => {
    if (sourceWalletId) return sourceWalletId;
    const matchingStationWallet = stationWallets.find(
      (sw) => sw.stationId === effectiveStationId && sw.balance > 0,
    );
    return matchingStationWallet?.walletId ?? mainWallet?.id ?? '';
  }, [sourceWalletId, stationWallets, effectiveStationId, mainWallet]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === effectiveStationId) ?? null,
    [stations, effectiveStationId],
  );

  const walletOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; balance: number }> = [];
    if (mainWallet) {
      opts.push({
        value: mainWallet.id,
        label: `${t.payment.useMainWallet} (${formatMoney(mainWallet.balance, lang)})`,
        balance: mainWallet.balance,
      });
    }
    for (const sw of stationWallets) {
      const isMatching = sw.stationId === effectiveStationId;
      opts.push({
        value: sw.walletId,
        label: `${t.payment.useStationWallet}: ${sw.stationName} (${formatMoney(sw.balance, lang)})${!isMatching
            ? lang === 'ar'
              ? ' — [محطة أخرى]'
              : ' — [Other Station]'
            : ''
          }`,
        balance: sw.balance,
      });
    }
    return opts;
  }, [mainWallet, stationWallets, effectiveStationId, t, lang]);

  const selectedWalletOption = useMemo(
    () => walletOptions.find((w) => w.value === effectiveSourceWalletId) ?? null,
    [walletOptions, effectiveSourceWalletId],
  );

  const resetIdempotency = () => {
    setIdempotencyKey(createIdempotencyKey('pay'));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedAmount = Number(amountInput.trim());
    if (!effectiveStationId) {
      setValidationError(
        lang === 'ar' ? 'يرجى اختيار محطة الوقود' : 'Please select a station',
      );
      return;
    }
    if (!effectiveSourceWalletId) {
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

    paymentMutation.mutate(
      {
        stationId: effectiveStationId,
        sourceWalletId: effectiveSourceWalletId,
        amount: parsedAmount,
        idempotencyKey,
      },
      {
        onSuccess: (dto) => {
          setCompletedPayment(dto);
          resetIdempotency();
        },
        onError: (err) => {
          const parsed = extractApiError(err);
          // Only rotate the idempotency key if the backend rejected the request definitively (not on network timeout)
          if (parsed.code !== 'TIMEOUT' && parsed.code !== 'IN_PROGRESS') {
            resetIdempotency();
          }
        },
      },
    );
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const apiError = paymentMutation.isError
    ? extractApiError(paymentMutation.error)
    : null;

  const isFrozen = user?.status === 'FROZEN';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
          {t.payment.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          {t.payment.subtitle}
        </p>
      </div>

      {completedPayment ? (
        <Card className="space-y-6 border-2 border-emerald-500/40 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <CheckCircleIcon size={36} />
          </div>

          <div>
            <Badge tone="success">{completedPayment.status}</Badge>
            <h2 className="mt-2 text-xl font-extrabold text-content-primary">
              {t.payment.receiptTitle}
            </h2>
            <p className="mt-1 font-mono text-xs text-content-secondary">
              {completedPayment.reference} •{' '}
              {formatDateTime(completedPayment.completedAt ?? completedPayment.createdAt, lang)}
            </p>
          </div>

          {/* Prominent 6-Digit Verification Code for Station Attendant */}
          {completedPayment.verificationCode && (
            <div className="rounded-2xl border-2 border-brand-primary bg-brand-primary/10 p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                {t.payment.verificationCodeLabel}
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-mono text-4xl font-extrabold tracking-[0.3em] text-content-primary sm:text-5xl">
                  {completedPayment.verificationCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void handleCopyCode(completedPayment.verificationCode!)
                  }
                  leftIcon={<CopyIcon size={15} />}
                >
                  {copiedCode ? t.common.copied : t.common.copy}
                </Button>
              </div>
              <p className="text-xs text-content-secondary">
                {t.payment.verificationCodeHint}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 text-sm space-y-2 text-start">
            <div className="flex justify-between">
              <span className="text-content-secondary">
                {t.payment.selectStation}:
              </span>
              <span className="font-bold text-content-primary">
                {selectedStation?.name ?? completedPayment.toWalletId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">
                {t.payment.amountLabel}:
              </span>
              <span className="font-mono font-extrabold text-content-primary">
                {formatMoney(completedPayment.amount, lang)}
              </span>
            </div>
            {completedPayment.balanceAfter.from !== null && (
              <div className="flex justify-between">
                <span className="text-content-secondary">
                  {t.wallet.balanceAfter}:
                </span>
                <span className="font-mono font-bold text-emerald-500">
                  {formatMoney(completedPayment.balanceAfter.from, lang)}
                </span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setCompletedPayment(null);
              paymentMutation.reset();
            }}
          >
            {t.payment.newPayment}
          </Button>
        </Card>
      ) : (
        <Card className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Select
              label={t.payment.selectStation}
              value={effectiveStationId}
              onChange={(e) => {
                setStationId(e.target.value);
                resetIdempotency();
              }}
              options={stations.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.city}) — ${s.isActive ? t.stations.active : t.stations.inactive
                  }`,
              }))}
            />

            {selectedStation && (
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-surface-border bg-surface-elevated p-3 text-center text-xs">
                <div>
                  <span className="block text-content-secondary">
                    {t.stations.myStationBalance}
                  </span>
                  <strong className="font-mono text-brand-primary">
                    {formatMoney(selectedStation.myStationBalance, lang)}
                  </strong>
                </div>
                <div className="border-x border-surface-border">
                  <span className="block text-content-secondary">
                    {t.stations.mainBalance}
                  </span>
                  <strong className="font-mono text-content-primary">
                    {formatMoney(selectedStation.mainBalance, lang)}
                  </strong>
                </div>
                <div>
                  <span className="block text-content-secondary">
                    {t.stations.availableHere}
                  </span>
                  <strong className="font-mono text-emerald-500">
                    {formatMoney(selectedStation.availableHere, lang)}
                  </strong>
                </div>
              </div>
            )}

            <Select
              label={t.payment.selectSourceWallet}
              value={effectiveSourceWalletId}
              onChange={(e) => {
                setSourceWalletId(e.target.value);
                resetIdempotency();
              }}
              options={walletOptions.map((w) => ({
                value: w.value,
                label: w.label,
              }))}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-content-primary">
                  {t.payment.amountLabel}
                </span>
                {selectedWalletOption && selectedWalletOption.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountInput(String(selectedWalletOption.balance));
                      resetIdempotency();
                    }}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    {t.transfer.maxFullBalance} (
                    {formatMoney(selectedWalletOption.balance, lang)})
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
                <div className="space-y-1">
                  <p className="font-bold">{apiError.code}</p>
                  <p>{apiError.message}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void recentPaymentsQuery.refetch();
                }}
                leftIcon={<RefreshCwIcon size={15} />}
              >
                {t.payment.reconcileStatus}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isFrozen}
                isLoading={paymentMutation.isPending}
                leftIcon={<ReceiptIcon size={18} />}
              >
                {t.payment.submitPayment}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Recent Payments Reconcile Strip (In case of timeout or uncertain outcome) */}
      {recentPaymentsQuery.data && recentPaymentsQuery.data.items.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-content-primary">
              {lang === 'ar'
                ? 'آخر عمليات الدفع (اضغط للتحقق من الحالة أو رمز التحقق)'
                : 'Recent Fuel Payments (Tap to verify status or 6-digit code)'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void recentPaymentsQuery.refetch();
              }}
              leftIcon={<RefreshCwIcon size={14} />}
            >
              {t.common.retry}
            </Button>
          </div>
          <div className="divide-y divide-surface-border rounded-xl border border-surface-border">
            {recentPaymentsQuery.data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setInspectTxnId(item.id)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs hover:bg-surface-elevated transition-colors text-start"
              >
                <div>
                  <span className="font-mono font-bold text-content-primary">
                    {item.reference}
                  </span>{' '}
                  • <span>{item.to.stationName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">
                    {formatMoney(item.amount, lang)}
                  </span>
                  {item.verificationCode && (
                    <Badge tone="info" className="font-mono">
                      #{item.verificationCode}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <TransactionDetailModal
        transactionId={inspectTxnId}
        onClose={() => setInspectTxnId(null)}
      />
    </div>
  );
}

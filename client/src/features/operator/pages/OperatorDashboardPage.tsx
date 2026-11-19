import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import { ErrorState } from '../../../components/shared/ErrorState.js';
import { LoadingState } from '../../../components/shared/LoadingState.js';
import { CongestionBadge } from '../../../components/shared/StatusBadge.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatDateTime, formatMoney } from '../../../lib/format.js';
import type {
  CongestionLevel,
  OperatorPaymentDto,
} from '../../../types/api.types.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { useStationsQuery } from '../../stations/hooks/useStations.js';
import {
  useAssignOperatorStationMutation,
  useLookupPaymentCodeMutation,
  useOperatorPaymentsQuery,
  useOperatorSummaryQuery,
  useUpdateCongestionMutation,
} from '../hooks/useOperator.js';

export function OperatorDashboardPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const stationsQuery = useStationsQuery();
  const stations = stationsQuery.data ?? [];

  // ADMIN may pass ?stationId= to inspect any station; OPERATOR is scoped to users.operator_station_id (auto-assigned if NULL and switchable)
  const [adminStationId, setAdminStationId] = useState(
    () => searchParams.get('stationId') || '',
  );

  const selectedAdminStationId = adminStationId || stations[0]?.id || '';
  const effectiveStationId = isAdmin
    ? selectedAdminStationId || undefined
    : undefined;

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [codeInput, setCodeInput] = useState('');
  const [verifiedPayment, setVerifiedPayment] =
    useState<OperatorPaymentDto | null>(null);

  const summaryQuery = useOperatorSummaryQuery(effectiveStationId);
  const paymentsQuery = useOperatorPaymentsQuery(effectiveStationId, cursor);
  const lookupMutation = useLookupPaymentCodeMutation();
  const congestionMutation = useUpdateCongestionMutation();
  const assignStationMutation = useAssignOperatorStationMutation();

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    setVerifiedPayment(null);
    const trimmed = codeInput.trim();
    if (!/^\d{6}$/.test(trimmed)) return;

    lookupMutation.mutate(
      { code: trimmed, stationId: effectiveStationId },
      {
        onSuccess: (dto) => {
          setVerifiedPayment(dto);
        },
      },
    );
  };

  const handleCongestionChange = (level: CongestionLevel) => {
    congestionMutation.mutate({
      congestion: level,
      stationId: effectiveStationId,
    });
  };

  const summary = summaryQuery.data;
  const lookupError = lookupMutation.isError
    ? extractApiError(lookupMutation.error)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
            {t.operator.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            {t.operator.subtitle}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void summaryQuery.refetch();
            void paymentsQuery.refetch();
          }}
          leftIcon={<RefreshCwIcon size={15} />}
        >
          {t.common.retry}
        </Button>
      </div>

      {/* Station Selector (Allows OPERATOR to switch assigned station & ADMIN to inspect any station) */}
      {stations.length > 0 && (
        <Card className="bg-surface-elevated">
          <Select
            label={
              isAdmin
                ? lang === 'ar'
                  ? 'اختيار المحطة للمعاينة (صلاحية مدير النظام ADMIN)'
                  : 'Select Station to Inspect (ADMIN Override)'
                : lang === 'ar'
                  ? 'المحطة المسندة للمشغل (تغيير محطة العمل)'
                  : 'Assigned Operator Station (Switch Active Station)'
            }
            disabled={assignStationMutation.isPending}
            value={
              isAdmin
                ? selectedAdminStationId
                : (summary?.stationId ??
                    user?.operatorStationId ??
                    stations[0]?.id ??
                    '')
            }
            onChange={(e) => {
              const nextStationId = e.target.value;
              setCursor(undefined);
              setVerifiedPayment(null);
              if (isAdmin) {
                setAdminStationId(nextStationId);
              } else {
                assignStationMutation.mutate(nextStationId);
              }
            }}
            options={stations.map((s) => ({
              value: s.id,
              label: `${s.name} — ${s.city}`,
            }))}
          />
        </Card>
      )}

      {/* Daily Summary KPIs */}
      {summaryQuery.isLoading ? (
        <LoadingState />
      ) : summaryQuery.isError ? (
        <ErrorState
          message={extractApiError(summaryQuery.error).message}
          onRetry={() => {
            void summaryQuery.refetch();
          }}
        />
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card variant="hero">
              <p className="text-xs font-semibold text-blue-100">
                {t.operator.todayRevenue} ({summary.date})
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-white sm:text-3xl">
                {formatMoney(summary.totalAmount, lang)}
              </p>
              <p className="mt-1 text-xs text-blue-100">{summary.stationName}</p>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-content-secondary">
                {t.operator.todayCount}
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-brand-primary sm:text-3xl">
                {summary.paymentCount}
              </p>
              <p className="mt-1 text-xs text-content-muted">
                COMPLETED ({summary.date})
              </p>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-content-secondary">
                {t.operator.totalSettlementBalance}
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-emerald-500 sm:text-3xl">
                {formatMoney(summary.revenueBalance, lang)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={summary.isActive ? 'success' : 'danger'}>
                  {summary.isActive ? t.stations.active : t.stations.inactive}
                </Badge>
                <CongestionBadge level={summary.congestion} />
              </div>
            </Card>
          </div>

          {/* 6-Digit Verification Lookup + Congestion Control */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 6-Digit Payment Verification Code Lookup */}
            <Card className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-content-primary">
                  {t.operator.lookupTitle}
                </h2>
                <p className="mt-0.5 text-xs text-content-secondary">
                  {t.operator.lookupDesc}
                </p>
              </div>

              <form onSubmit={handleLookup} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={t.operator.lookupPlaceholder}
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) =>
                      setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    leftAdornment={<SearchIcon size={16} />}
                    className="font-mono tracking-widest text-base"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={codeInput.length !== 6}
                  isLoading={lookupMutation.isPending}
                >
                  {t.operator.verifyBtn}
                </Button>
              </form>

              {verifiedPayment && (
                <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-emerald-500">
                    <CheckCircleIcon size={18} />
                    <span>{t.operator.verifiedValid}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-content-secondary">
                        {t.wallet.reference}:{' '}
                      </span>
                      <strong className="font-mono text-content-primary">
                        {verifiedPayment.reference}
                      </strong>
                    </div>
                    <div>
                      <span className="text-content-secondary">
                        {t.payment.amountLabel}:{' '}
                      </span>
                      <strong className="font-mono text-emerald-500">
                        {formatMoney(verifiedPayment.amount, lang)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-content-secondary">
                        {t.operator.payerName}:{' '}
                      </span>
                      <strong className="text-content-primary">
                        {verifiedPayment.payerName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-content-secondary">
                        {t.wallet.date}:{' '}
                      </span>
                      <strong className="font-mono text-content-primary">
                        {formatDateTime(verifiedPayment.createdAt, lang)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {lookupError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{lookupError.code}</p>
                    <p>{lookupError.message}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Station Congestion Switcher */}
            <Card className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-content-primary">
                  {t.operator.congestionControl}
                </h2>
                <p className="mt-0.5 text-xs text-content-secondary">
                  {summary.stationName}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => {
                  const isCurrent = summary.congestion === level;
                  return (
                    <Button
                      key={level}
                      variant={
                        isCurrent
                          ? level === 'LOW'
                            ? 'success'
                            : level === 'MEDIUM'
                              ? 'primary'
                              : 'danger'
                          : 'outline'
                      }
                      isLoading={
                        congestionMutation.isPending &&
                        congestionMutation.variables?.congestion === level
                      }
                      onClick={() => handleCongestionChange(level)}
                    >
                      {level === 'LOW'
                        ? t.stations.congestion_LOW
                        : level === 'MEDIUM'
                          ? t.stations.congestion_MEDIUM
                          : t.stations.congestion_HIGH}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {/* Incoming Station Payments Feed */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-content-primary">
          {t.operator.incomingPayments}
        </h2>

        {paymentsQuery.isLoading ? (
          <LoadingState />
        ) : !paymentsQuery.data || paymentsQuery.data.items.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={24} />}
            title={t.dashboard.noRecentTxns}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead className="border-b border-surface-border bg-surface-elevated text-content-secondary">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t.wallet.reference}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t.operator.payerName}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t.payment.amountLabel}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold">
                      Code
                    </th>
                    <th className="px-4 py-3 text-start font-semibold">
                      {t.wallet.date}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {paymentsQuery.data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-elevated/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-content-primary">
                        {item.reference}
                      </td>
                      <td className="px-4 py-3 font-semibold text-content-primary">
                        {item.payerName}
                      </td>
                      <td className="px-4 py-3 font-mono font-extrabold text-emerald-500">
                        {formatMoney(item.amount, lang)}
                      </td>
                      <td className="px-4 py-3">
                        {item.verificationCode ? (
                          <Badge tone="info" className="font-mono">
                            {item.verificationCode}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-content-secondary">
                        {formatDateTime(item.createdAt, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              {cursor ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCursor(undefined)}
                >
                  {lang === 'ar' ? 'الصفحة الأولى' : 'First Page'}
                </Button>
              ) : (
                <span />
              )}
              {paymentsQuery.data.nextCursor && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setCursor(paymentsQuery.data?.nextCursor ?? undefined)
                  }
                >
                  {t.transactions.loadMore}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

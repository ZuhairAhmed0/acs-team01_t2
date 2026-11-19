import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Button } from '../../../components/ui/Button.js';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusCircleIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Modal } from '../../../components/ui/Modal.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatMoney } from '../../../lib/format.js';
import { createIdempotencyKey } from '../../../lib/idempotency.js';
import type { TransactionDto } from '../../../types/api.types.js';
import { useTopupMutation } from '../hooks/useWalletMutations.js';

const PRESET_AMOUNTS = [5_000, 10_000, 30_000, 50_000, 100_000] as const;

export interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const { t, lang } = useLanguage();
  const topupMutation = useTopupMutation();

  const [amountInput, setAmountInput] = useState('30000');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey('topup'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [completedTxn, setCompletedTxn] = useState<TransactionDto | null>(null);

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    setValidationError(null);
    // Generate a fresh Idempotency-Key whenever the user changes the amount payload
    setIdempotencyKey(createIdempotencyKey('topup'));
  };

  const handleClose = () => {
    setCompletedTxn(null);
    setValidationError(null);
    topupMutation.reset();
    setIdempotencyKey(createIdempotencyKey('topup'));
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsed = Number(amountInput.trim());
    if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 500_000) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال مبلغ صحيح بين 1,000 و 500,000 ج.س'
          : 'Please enter a whole integer amount between 1,000 and 500,000 SDG',
      );
      return;
    }

    topupMutation.mutate(
      { amount: parsed, idempotencyKey },
      {
        onSuccess: (dto) => {
          setCompletedTxn(dto);
          setIdempotencyKey(createIdempotencyKey('topup'));
        },
        onError: () => {
          // Generate a new key if the user wants to try a fresh transaction after a bank failure
          setIdempotencyKey(createIdempotencyKey('topup'));
        },
      },
    );
  };

  const apiError = topupMutation.isError
    ? extractApiError(topupMutation.error)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t.wallet.topUpTitle}
      subtitle={t.wallet.topUpSubtitle}
    >
      {completedTxn ? (
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <CheckCircleIcon size={30} />
          </div>
          <h3 className="text-base font-bold text-content-primary">
            {t.wallet.topUpSuccess}
          </h3>
          <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 text-sm space-y-2 text-start">
            <div className="flex justify-between">
              <span className="text-content-secondary">
                {t.wallet.reference}:
              </span>
              <span className="font-mono font-bold text-content-primary">
                {completedTxn.reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">
                {t.wallet.amountLabel}:
              </span>
              <span className="font-bold text-emerald-500">
                +{formatMoney(completedTxn.amount, lang)}
              </span>
            </div>
            {completedTxn.balanceAfter.to !== null && (
              <div className="flex justify-between">
                <span className="text-content-secondary">
                  {t.wallet.balanceAfter}:
                </span>
                <span className="font-bold text-content-primary">
                  {formatMoney(completedTxn.balanceAfter.to, lang)}
                </span>
              </div>
            )}
          </div>
          <Button variant="primary" fullWidth onClick={handleClose}>
            {t.common.close}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Preset Amounts */}
          <div>
            <p className="mb-2 text-xs font-medium text-content-secondary">
              {lang === 'ar' ? 'مبالغ سريعة:' : 'Quick amounts:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountChange(String(preset))}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${Number(amountInput) === preset
                      ? 'border-brand-primary bg-brand-primary/15 text-brand-primary'
                      : 'border-surface-border bg-surface-elevated text-content-secondary hover:text-content-primary'
                    }`}
                >
                  {formatMoney(preset, lang)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t.wallet.amountLabel}
            type="number"
            min={1000}
            max={500000}
            step={1}
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={t.wallet.amountPlaceholder}
            error={validationError}
            rightAdornment={
              <span className="text-xs font-bold">{t.currency}</span>
            }
          />

          {/* <div className="flex items-center justify-between text-[11px] text-content-muted">
            <span>Idempotency-Key:</span>
            <Badge tone="neutral" className="font-mono text-[10px]">
              {idempotencyKey.slice(0, 22)}...
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={topupMutation.isPending}
              leftIcon={<PlusCircleIcon size={17} />}
            >
              {t.wallet.confirmTopUp}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}


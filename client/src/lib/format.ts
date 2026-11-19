import type { Language } from '../locales/translations.js';

/**
 * Centralized Formatting Utilities for Money, Dates, and API Errors.
 *
 * All monetary amounts in Fuel Wallet are whole SDG integers (never floats).
 * These helpers format numbers and timestamps consistently according to the active language (`ar` or `en`).
 */

/**
 * Formats an integer SDG amount with thousands separators and currency label.
 * Example: `formatMoney(30000, 'ar')` -> `"30,000 ج.س"`, `formatMoney(30000, 'en')` -> `"30,000 SDG"`
 */
export function formatMoney(
  amount: number | bigint | null | undefined,
  lang: Language = 'ar',
): string {
  const numeric = typeof amount === 'bigint' ? Number(amount) : (amount ?? 0);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numeric);

  const unit = lang === 'ar' ? 'ج.س' : 'SDG';
  return `${formatted} ${unit}`;
}

/**
 * Formats a signed ledger delta (`+30,000 SDG` or `-12,000 SDG`).
 */
export function formatSignedDelta(
  delta: number,
  lang: Language = 'ar',
): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(delta), lang)}`;
}

/**
 * Formats an ISO 8601 timestamp into a readable localized date & time string.
 */
export function formatDateTime(
  isoString: string | null | undefined,
  lang: Language = 'ar',
): string {
  if (!isoString) {
    return '—';
  }
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formats a wallet identifier into a short, human-friendly 6-digit wallet number (e.g. `104829`)
 * instead of displaying raw database UUIDs in the UI.
 */
export function formatWalletNumber(
  walletId: string | null | undefined,
  walletNumber?: number,
): string {
  if (typeof walletNumber === 'number' && Number.isFinite(walletNumber)) {
    return String(walletNumber);
  }
  if (!walletId) {
    return '100000';
  }
  const hex = walletId.replace(/-/g, '').slice(0, 8);
  const parsed = Number.parseInt(hex, 16);
  if (Number.isNaN(parsed)) {
    return '100000';
  }
  return String(100000 + (parsed % 900000));
}


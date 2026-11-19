import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { ERROR_CATALOG } from '../errors/catalog.js';

/**
 * Schema for whole SDG pound amounts (positive safe integer).
 */
export const amountSchema = z
  .number({ message: ERROR_CATALOG.INVALID_AMOUNT.message })
  .int({ message: ERROR_CATALOG.INVALID_AMOUNT.message })
  .positive({ message: ERROR_CATALOG.INVALID_AMOUNT.message })
  .safe({ message: ERROR_CATALOG.INVALID_AMOUNT.message });

/**
 * Validates and converts a numeric amount to BigInt, throwing INVALID_AMOUNT (400) if invalid.
 */
export function parseAmountToBigInt(value: unknown): bigint {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new AppError('INVALID_AMOUNT');
  }
  return BigInt(value);
}

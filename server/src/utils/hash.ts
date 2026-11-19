import { createHash } from 'node:crypto';
import type { TransactionType } from '../generated/prisma/client.js';

/**
 * Computes a lowercase hex SHA-256 digest of the given input string.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export interface RequestHashInput {
  type: TransactionType | string;
  fromWalletId: string;
  toWalletId: string;
  amount: bigint | number;
}

/**
 * Computes the 64-character hex SHA-256 digest of the canonical JSON
 * of `{ type, fromWalletId, toWalletId, amount }`.
 */
export function requestHash(input: RequestHashInput): string {
  const canonicalJson = JSON.stringify({
    type: input.type,
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId,
    amount: Number(input.amount),
  });
  return sha256(canonicalJson);
}

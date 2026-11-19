/**
 * Formats a numeric transaction sequence number as a human-readable reference (e.g., "TX-000123").
 */
export function formatTxReference(seq: number): string {
  return `TX-${String(seq).padStart(6, '0')}`;
}


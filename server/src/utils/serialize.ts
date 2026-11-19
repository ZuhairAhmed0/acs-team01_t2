/**
 * JSON.stringify replacer that converts BigInt values to standard JS numbers.
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? Number(value) : value;
}


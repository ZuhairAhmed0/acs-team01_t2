/**
 * Centralized React Query Keys Factory.
 * Organizing query keys in one place prevents typos and makes targeted cache
 * invalidation after mutations predictable and maintainable.
 */
export const queryKeys = {
  me: ['me'] as const,
  stations: (city?: string) => ['stations', { city: city || 'ALL' }] as const,
  stationDetail: (id: string) => ['stations', 'detail', id] as const,
  transactions: (filters: {
    type?: string;
    status?: string;
    cursor?: string;
    limit?: number;
  }) => ['transactions', filters] as const,
  transactionDetail: (id: string) => ['transactions', 'detail', id] as const,
  walletLedger: (walletId: string, cursor?: string) =>
    ['walletLedger', walletId, { cursor: cursor || 'FIRST' }] as const,
  operatorSummary: (stationId?: string) =>
    ['operator', 'summary', { stationId: stationId || 'OWN' }] as const,
  operatorPayments: (stationId?: string, cursor?: string) =>
    [
      'operator',
      'payments',
      { stationId: stationId || 'OWN', cursor: cursor || 'FIRST' },
    ] as const,
  adminBankStatus: ['admin', 'bankStatus'] as const,
  adminReconcile: ['admin', 'reconcile'] as const,
};


/// <reference types="@clerk/express/env" />

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'DRIVER' | 'OPERATOR' | 'ADMIN';
        status: 'ACTIVE' | 'FROZEN';
        operatorStationId?: string | null;
      };
      idempotencyKey?: string;
    }
  }
}

export {};

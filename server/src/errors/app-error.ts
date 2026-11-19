import { ERROR_CATALOG, type ErrorCode } from './catalog.js';


export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly httpStatus: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode | string,
    httpStatus?: number,
    message?: string,
    details?: unknown,
  ) {
    const entry =
      code in ERROR_CATALOG ? ERROR_CATALOG[code as ErrorCode] : undefined;
    const resolvedStatus = httpStatus ?? entry?.httpStatus ?? 500;
    const resolvedMessage = message ?? entry?.message ?? code;

    super(resolvedMessage);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = resolvedStatus;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

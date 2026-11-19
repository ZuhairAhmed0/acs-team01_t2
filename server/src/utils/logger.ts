import { bigIntReplacer } from './serialize.js';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'HTTP' | 'DEBUG';

const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: '\x1b[36m', // Cyan
  HTTP: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  DEBUG: '\x1b[35m', // Magenta
};

const RESET_COLOR = '\x1b[0m';
const DIM_COLOR = '\x1b[2m';

function serializeMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (value instanceof Error) {
        normalized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else if (typeof value === 'bigint') {
        normalized[key] = Number(value);
      } else if (value !== undefined) {
        normalized[key] = value;
      }
    }
    return ` ${DIM_COLOR}${JSON.stringify(normalized, bigIntReplacer)}${RESET_COLOR}`;
  } catch {
    return '';
  }
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const color = LEVEL_COLORS[level];
  const line = `${DIM_COLOR}[${timestamp}]${RESET_COLOR} ${color}[${level}]${RESET_COLOR} [${scope}] ${message}${serializeMeta(meta)}`;

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Centralized structured logger for the Fuel Wallet backend.
 * Safely serializes `BigInt` monetary values and `Error` instances.
 */
export const logger = {
  info(scope: string, message: string, meta?: Record<string, unknown>): void {
    writeLog('INFO', scope, message, meta);
  },
  http(scope: string, message: string, meta?: Record<string, unknown>): void {
    writeLog('HTTP', scope, message, meta);
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>): void {
    writeLog('WARN', scope, message, meta);
  },
  error(scope: string, message: string, meta?: Record<string, unknown>): void {
    writeLog('ERROR', scope, message, meta);
  },
  debug(scope: string, message: string, meta?: Record<string, unknown>): void {
    writeLog('DEBUG', scope, message, meta);
  },
};


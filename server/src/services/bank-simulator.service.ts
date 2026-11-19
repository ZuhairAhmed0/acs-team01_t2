import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

export type BankGatewayStatus = 'UP' | 'DOWN';

const BANK_STATUS_SETTING_KEY = 'bank_gateway_status';

/**
 * Simulated external bank gateway service.
 * Reads and updates `system_settings` key `'bank_gateway_status'`.
 */
export class BankSimulatorService {
  /**
   * Reads the current bank gateway status (`'UP'` or `'DOWN'`) from `system_settings`.
   */
  async getStatus(): Promise<BankGatewayStatus> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: BANK_STATUS_SETTING_KEY },
    });

    if (setting?.value === 'DOWN') {
      return 'DOWN';
    }

    return 'UP';
  }

  /**
   * Returns `true` when `bank_gateway_status` is `'UP'`, `false` when `'DOWN'`.
   */
  async isUp(): Promise<boolean> {
    const status = await this.getStatus();
    return status === 'UP';
  }

  /**
   * Simulates charging the external bank: waits `BANK_LATENCY_MS` (default 400ms)
   * and throws `BANK_UNAVAILABLE` (503) if the gateway is `'DOWN'`.
   */
  async charge(userId: string, amount: bigint): Promise<void> {
    if (env.BANK_LATENCY_MS > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, env.BANK_LATENCY_MS),
      );
    }

    const up = await this.isUp();
    if (!up) {
      logger.warn('BankSimulator', 'Bank charge rejected because gateway is DOWN', {
        userId,
        amount,
        status: 'DOWN',
      });
      throw new AppError('BANK_UNAVAILABLE');
    }

    logger.info('BankSimulator', 'Bank gateway charge authorized', {
      userId,
      amount,
      latencyMs: env.BANK_LATENCY_MS,
    });
  }

  /**
   * Upserts `'bank_gateway_status'` in `system_settings`.
   */
  async setStatus(status: BankGatewayStatus): Promise<{ status: BankGatewayStatus }> {
    await prisma.systemSetting.upsert({
      where: { key: BANK_STATUS_SETTING_KEY },
      update: { value: status },
      create: { key: BANK_STATUS_SETTING_KEY, value: status },
    });

    logger.info('BankSimulator', `Bank gateway status switched to ${status}`, {
      status,
    });

    return { status };
  }
}

export const bankSimulatorService = new BankSimulatorService();

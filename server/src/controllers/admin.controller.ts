import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { UserStatus } from '../generated/prisma/client.js';
import {
  type BankGatewayStatus,
  bankSimulatorService,
} from '../services/bank-simulator.service.js';
import { reconcileService } from '../services/reconcile.service.js';
import {
  createStation,
  deleteStation,
  updateStation,
} from './stations.controller.js';

/**
 * Controller stub for admin system overview.
 */
export async function getAdminOverview(
  _req: Request,
  _res: Response,
): Promise<void> {
  throw new AppError('NOT_IMPLEMENTED', 501);
}

/**
 * Returns the current simulated bank gateway status (`'UP'` or `'DOWN'`).
 * Endpoint: GET /api/admin/bank-status
 */
export async function getBankGatewayStatus(
  _req: Request,
  res: Response,
): Promise<void> {
  const status = await bankSimulatorService.getStatus();
  res.status(200).json({ data: { status } });
}

/**
 * Updates the simulated bank gateway status (`'UP'` or `'DOWN'`).
 * Endpoint: POST /api/admin/bank-status
 */
export async function updateBankGatewayStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { status } = req.body as { status: BankGatewayStatus };
  const result = await bankSimulatorService.setStatus(status);
  res.status(200).json({ data: result });
}

/**
 * Runs ledger reconciliation across all wallets, transactions, and ledger entries.
 * Endpoint: GET /api/admin/reconcile (and POST /api/admin/reconcile)
 */
export async function runReconciliation(
  _req: Request,
  res: Response,
): Promise<void> {
  const report = await reconcileService.reconcile();
  res.status(200).json({ data: report });
}

/**
 * Creates a fuel station via Admin route.
 * Endpoint: POST /api/admin/stations
 */
export const createAdminStation = createStation;

/**
 * Updates or activates/deactivates a fuel station.
 * Endpoint: PATCH /api/admin/stations/:id
 */
export const patchAdminStation = updateStation;

/**
 * Deletes a fuel station via Admin route.
 * Endpoint: DELETE /api/admin/stations/:id
 */
export const deleteAdminStation = deleteStation;

/**
 * Updates a user's status (`'ACTIVE'` or `'FROZEN'`).
 * Endpoint: PATCH /api/admin/users/:id { status: 'ACTIVE' | 'FROZEN' }
 */
export async function patchAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id);
  const { status } = req.body as { status: UserStatus };

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
  });

  res.status(200).json({ data: updated });
}

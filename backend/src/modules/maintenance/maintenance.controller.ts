import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import {
  type CreateMaintenanceInput,
  maintenanceListQuerySchema,
  type UpdateMaintenanceStatusInput,
} from './maintenance.schema.js';
import * as maintenanceService from './maintenance.service.js';

/** GET /api/v1/maintenance-requests */
export async function list(req: Request, res: Response) {
  const { data, meta } = await maintenanceService.list(currentUser(req), maintenanceListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/maintenance-requests/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await maintenanceService.listMine(currentUser(req))));
}

/** POST /api/v1/maintenance-requests */
export async function create(req: Request, res: Response) {
  const request = await maintenanceService.create(currentUser(req), req.body as CreateMaintenanceInput);
  res.status(201).json(ok(request));
}

/** PATCH /api/v1/maintenance-requests/:id/status */
export async function updateStatus(req: Request, res: Response) {
  const input = req.body as UpdateMaintenanceStatusInput;
  res.json(ok(await maintenanceService.updateStatus(currentUser(req), param(req), input)));
}

/** POST /api/v1/maintenance-requests/:id/confirm */
export async function confirm(req: Request, res: Response) {
  res.json(ok(await maintenanceService.confirm(currentUser(req), param(req))));
}

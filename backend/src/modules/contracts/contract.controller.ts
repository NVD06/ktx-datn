import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { contractListQuerySchema, type CancelContractInput } from './contract.schema.js';
import * as contractService from './contract.service.js';

/** GET /api/v1/contracts */
export async function list(req: Request, res: Response) {
  const { data, meta } = await contractService.list(currentUser(req), contractListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/contracts/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await contractService.listMine(currentUser(req))));
}

/** GET /api/v1/contracts/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await contractService.getById(currentUser(req), param(req))));
}

/** POST /api/v1/contracts/:id/sign */
export async function sign(req: Request, res: Response) {
  res.json(ok(await contractService.sign(currentUser(req), param(req))));
}

/** POST /api/v1/contracts/:id/decline */
export async function decline(req: Request, res: Response) {
  res.json(ok(await contractService.decline(currentUser(req), param(req), req.body as CancelContractInput)));
}

/** POST /api/v1/contracts/:id/cancel */
export async function cancel(req: Request, res: Response) {
  res.json(ok(await contractService.cancel(currentUser(req), param(req), req.body as CancelContractInput)));
}

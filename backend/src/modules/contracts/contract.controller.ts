import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import * as contractService from './contract.service.js';

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

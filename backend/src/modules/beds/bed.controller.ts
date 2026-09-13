import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import type { CreateBedInput, UpdateBedInput } from './bed.schema.js';
import * as bedService from './bed.service.js';

/** POST /api/v1/rooms/:id/beds */
export async function create(req: Request, res: Response) {
  const bed = await bedService.create(currentUser(req), param(req), req.body as CreateBedInput);
  res.status(201).json(ok(bed));
}

/** PATCH /api/v1/beds/:id */
export async function update(req: Request, res: Response) {
  const bed = await bedService.update(currentUser(req), param(req), req.body as UpdateBedInput);
  res.json(ok(bed));
}

/** DELETE /api/v1/beds/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await bedService.remove(currentUser(req), param(req))));
}

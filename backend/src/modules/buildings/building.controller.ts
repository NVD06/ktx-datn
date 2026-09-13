import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import {
  buildingListQuerySchema,
  type CreateBuildingInput,
  type UpdateBuildingInput,
} from './building.schema.js';
import * as buildingService from './building.service.js';

/** GET /api/v1/buildings */
export async function list(req: Request, res: Response) {
  const query = buildingListQuerySchema.parse(req.query);
  const { data, meta } = await buildingService.list(currentUser(req), query);
  res.json(ok(data, meta));
}

/** GET /api/v1/buildings/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await buildingService.getById(currentUser(req), param(req))));
}

/** POST /api/v1/buildings */
export async function create(req: Request, res: Response) {
  const building = await buildingService.create(req.body as CreateBuildingInput);
  res.status(201).json(ok(building));
}

/** PATCH /api/v1/buildings/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await buildingService.update(param(req), req.body as UpdateBuildingInput)));
}

/** DELETE /api/v1/buildings/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await buildingService.remove(param(req))));
}

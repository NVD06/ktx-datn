import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { param } from '../../utils/request.js';
import {
  roomTypeListQuerySchema,
  type CreateRoomTypeInput,
  type UpdateRoomTypeInput,
} from './room-type.schema.js';
import * as roomTypeService from './room-type.service.js';

/** GET /api/v1/room-types */
export async function list(req: Request, res: Response) {
  const { data, meta } = await roomTypeService.list(roomTypeListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/room-types/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await roomTypeService.getById(param(req))));
}

/** POST /api/v1/room-types */
export async function create(req: Request, res: Response) {
  const roomType = await roomTypeService.create(req.body as CreateRoomTypeInput);
  res.status(201).json(ok(roomType));
}

/** PATCH /api/v1/room-types/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await roomTypeService.update(param(req), req.body as UpdateRoomTypeInput)));
}

/** DELETE /api/v1/room-types/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await roomTypeService.remove(param(req))));
}

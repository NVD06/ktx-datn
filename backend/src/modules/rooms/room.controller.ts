import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import {
  availableRoomQuerySchema,
  buildingRoomListQuerySchema,
  roomListQuerySchema,
  type CreateRoomInput,
  type UpdateRoomInput,
} from './room.schema.js';
import * as roomService from './room.service.js';

/** GET /api/v1/rooms */
export async function list(req: Request, res: Response) {
  const query = roomListQuerySchema.parse(req.query);
  const { data, meta } = await roomService.list(currentUser(req), query);
  res.json(ok(data, meta));
}

/** GET /api/v1/buildings/:id/rooms */
export async function listByBuilding(req: Request, res: Response) {
  const query = buildingRoomListQuerySchema.parse(req.query);
  const { data, meta } = await roomService.listByBuilding(currentUser(req), param(req), query);
  res.json(ok(data, meta));
}

/** GET /api/v1/rooms/available */
export async function listAvailable(req: Request, res: Response) {
  const query = availableRoomQuerySchema.parse(req.query);
  const { data, meta } = await roomService.listAvailable(currentUser(req), query);
  res.json(ok(data, meta));
}

/** GET /api/v1/rooms/available/options */
export async function listAvailableOptions(req: Request, res: Response) {
  res.json(ok(await roomService.listAvailableOptions(currentUser(req))));
}

/** GET /api/v1/rooms/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await roomService.getById(currentUser(req), param(req))));
}

/** POST /api/v1/rooms */
export async function create(req: Request, res: Response) {
  const room = await roomService.create(currentUser(req), req.body as CreateRoomInput);
  res.status(201).json(ok(room));
}

/** PATCH /api/v1/rooms/:id */
export async function update(req: Request, res: Response) {
  const room = await roomService.update(currentUser(req), param(req), req.body as UpdateRoomInput);
  res.json(ok(room));
}

/** DELETE /api/v1/rooms/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await roomService.remove(currentUser(req), param(req))));
}

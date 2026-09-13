import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { param } from '../../utils/request.js';
import { userListQuerySchema, type UpdateUserInput } from './user.schema.js';
import * as userService from './user.service.js';

/** GET /api/v1/users */
export async function list(req: Request, res: Response) {
  const { data, meta } = await userService.list(userListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** PATCH /api/v1/users/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await userService.update(param(req), req.body as UpdateUserInput)));
}

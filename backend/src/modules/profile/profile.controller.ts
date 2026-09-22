import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser } from '../../utils/request.js';
import type { UpdateProfileInput } from './profile.schema.js';
import * as profileService from './profile.service.js';

/** GET /api/v1/profile */
export async function get(req: Request, res: Response) {
  res.json(ok(await profileService.get(currentUser(req))));
}

/** PATCH /api/v1/profile */
export async function update(req: Request, res: Response) {
  res.json(ok(await profileService.update(currentUser(req), req.body as UpdateProfileInput)));
}

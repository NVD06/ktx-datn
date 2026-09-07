import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import * as buildingService from './building.service.js';

/** GET /api/v1/buildings */
export async function list(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { data, meta } = await buildingService.list(req.user, req.query);
  res.json({ success: true, data, meta });
}

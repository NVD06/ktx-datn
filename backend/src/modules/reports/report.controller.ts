import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser } from '../../utils/request.js';
import * as reportService from './report.service.js';

/** GET /api/v1/reports/overview */
export async function overview(req: Request, res: Response) {
  res.json(ok(await reportService.overview(currentUser(req))));
}

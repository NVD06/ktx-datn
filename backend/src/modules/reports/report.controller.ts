import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser } from '../../utils/request.js';
import { debtorQuerySchema, occupancyQuerySchema, revenueQuerySchema } from './report.schema.js';
import * as reportService from './report.service.js';

/** GET /api/v1/reports/overview */
export async function overview(req: Request, res: Response) {
  res.json(ok(await reportService.overview(currentUser(req))));
}

/** GET /api/v1/reports/occupancy */
export async function occupancy(req: Request, res: Response) {
  res.json(ok(await reportService.occupancy(currentUser(req), occupancyQuerySchema.parse(req.query))));
}
export async function revenue(req: Request, res: Response) {
  res.json(ok(await reportService.revenue(currentUser(req), revenueQuerySchema.parse(req.query))));
}
export async function debt(req: Request, res: Response) {
  res.json(ok(await reportService.debt(currentUser(req))));
}
export async function debtors(req: Request, res: Response) {
  const { data, meta } = await reportService.debtors(currentUser(req), debtorQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

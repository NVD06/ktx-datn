import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { hygieneListQuerySchema, hygieneSheetQuerySchema, type SaveHygieneInput } from './hygiene.schema.js';
import * as hygieneService from './hygiene.service.js';

/** GET /api/v1/hygiene-records */
export async function list(req: Request, res: Response) {
  const { data, meta } = await hygieneService.list(currentUser(req), hygieneListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/hygiene-records/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await hygieneService.listMine(currentUser(req))));
}

/** GET /api/v1/hygiene-records/sheet */
export async function sheet(req: Request, res: Response) {
  res.json(ok(await hygieneService.sheet(currentUser(req), hygieneSheetQuerySchema.parse(req.query))));
}

/** POST /api/v1/hygiene-records */
export async function save(req: Request, res: Response) {
  res.json(ok(await hygieneService.save(currentUser(req), req.body as SaveHygieneInput)));
}

/** DELETE /api/v1/hygiene-records/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await hygieneService.remove(currentUser(req), param(req))));
}

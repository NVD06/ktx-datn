import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { param } from '../../utils/request.js';
import type { DormRuleInput } from './dorm-rule.schema.js';
import * as dormRuleService from './dorm-rule.service.js';

/** GET /api/v1/dorm-rules */
export async function list(_req: Request, res: Response) {
  res.json(ok(await dormRuleService.list()));
}

/** POST /api/v1/dorm-rules */
export async function create(req: Request, res: Response) {
  res.status(201).json(ok(await dormRuleService.create(req.body as DormRuleInput)));
}

/** PATCH /api/v1/dorm-rules/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await dormRuleService.update(param(req), req.body as DormRuleInput)));
}

/** DELETE /api/v1/dorm-rules/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await dormRuleService.remove(param(req))));
}

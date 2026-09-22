import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { param } from '../../utils/request.js';
import {
  registrationPeriodListQuerySchema,
  type CreateRegistrationPeriodInput,
  type UpdateRegistrationPeriodInput,
} from './registration-period.schema.js';
import * as periodService from './registration-period.service.js';

/** GET /api/v1/registration-periods */
export async function list(req: Request, res: Response) {
  const { data, meta } = await periodService.list(registrationPeriodListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/registration-periods/current */
export async function getCurrent(_req: Request, res: Response) {
  res.json(ok(await periodService.getCurrent()));
}

/** POST /api/v1/registration-periods */
export async function create(req: Request, res: Response) {
  const period = await periodService.create(req.body as CreateRegistrationPeriodInput);
  res.status(201).json(ok(period));
}

/** PATCH /api/v1/registration-periods/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await periodService.update(param(req), req.body as UpdateRegistrationPeriodInput)));
}

/** POST /api/v1/registration-periods/:id/open */
export async function open(req: Request, res: Response) {
  res.json(ok(await periodService.open(param(req))));
}

/** POST /api/v1/registration-periods/:id/close */
export async function close(req: Request, res: Response) {
  res.json(ok(await periodService.close(param(req))));
}

/** DELETE /api/v1/registration-periods/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await periodService.remove(param(req))));
}

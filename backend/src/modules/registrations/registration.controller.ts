import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { registrationListQuerySchema, type CreateRegistrationInput } from './registration.schema.js';
import * as registrationService from './registration.service.js';

/** GET /api/v1/registrations */
export async function list(req: Request, res: Response) {
  const { data, meta } = await registrationService.list(
    currentUser(req),
    registrationListQuerySchema.parse(req.query),
  );
  res.json(ok(data, meta));
}

/** GET /api/v1/registrations/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await registrationService.listMine(currentUser(req))));
}

/** POST /api/v1/registrations */
export async function create(req: Request, res: Response) {
  const registration = await registrationService.create(
    currentUser(req),
    req.body as CreateRegistrationInput,
  );
  res.status(201).json(ok(registration));
}

/** POST /api/v1/registrations/:id/cancel */
export async function cancel(req: Request, res: Response) {
  res.json(ok(await registrationService.cancel(currentUser(req), param(req))));
}

import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import {
  registrationListQuerySchema,
  type ApproveRegistrationInput,
  type CreateRegistrationInput,
  type RejectRegistrationInput,
} from './registration.schema.js';
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

/** POST /api/v1/registrations/:id/approve */
export async function approve(req: Request, res: Response) {
  res.json(ok(await registrationService.approve(currentUser(req), param(req), req.body as ApproveRegistrationInput)));
}

/** POST /api/v1/registrations/:id/reject */
export async function reject(req: Request, res: Response) {
  res.json(ok(await registrationService.reject(currentUser(req), param(req), req.body as RejectRegistrationInput)));
}

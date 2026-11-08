import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { type AnnouncementInput, announcementListQuerySchema } from './announcement.schema.js';
import * as announcementService from './announcement.service.js';

/** GET /api/v1/announcements */
export async function list(req: Request, res: Response) {
  const { data, meta } = await announcementService.list(currentUser(req), announcementListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/announcements/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await announcementService.listMine(currentUser(req))));
}

/** POST /api/v1/announcements */
export async function create(req: Request, res: Response) {
  res.status(201).json(ok(await announcementService.create(currentUser(req), req.body as AnnouncementInput)));
}

/** PATCH /api/v1/announcements/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await announcementService.update(currentUser(req), param(req), req.body as AnnouncementInput)));
}

/** DELETE /api/v1/announcements/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await announcementService.remove(currentUser(req), param(req))));
}

/** POST /api/v1/announcements/:id/read */
export async function markRead(req: Request, res: Response) {
  res.json(ok(await announcementService.markRead(currentUser(req), param(req))));
}

import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { invoiceListQuerySchema } from './invoice.schema.js';
import * as invoiceService from './invoice.service.js';

/** GET /api/v1/invoices */
export async function list(req: Request, res: Response) {
  const { data, meta } = await invoiceService.list(currentUser(req), invoiceListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/invoices/summary */
export async function summary(req: Request, res: Response) {
  res.json(ok(await invoiceService.summary(currentUser(req), invoiceListQuerySchema.parse(req.query))));
}

/** GET /api/v1/invoices/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await invoiceService.listMine(currentUser(req))));
}

/** GET /api/v1/invoices/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await invoiceService.getById(currentUser(req), param(req))));
}

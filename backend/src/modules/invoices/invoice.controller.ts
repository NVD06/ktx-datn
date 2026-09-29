import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import { invoiceListQuerySchema } from './invoice.schema.js';
import * as paymentService from '../payments/payment.service.js';
import * as invoiceService from './invoice.service.js';
import { utilitySheetQuerySchema, type BillUtilitiesInput } from './utility.schema.js';
import * as utilityService from './utility.service.js';

/** GET /api/v1/invoices */
export async function list(req: Request, res: Response) {
  const { data, meta } = await invoiceService.list(currentUser(req), invoiceListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** GET /api/v1/invoices/summary */
export async function summary(req: Request, res: Response) {
  res.json(ok(await invoiceService.summary(currentUser(req), invoiceListQuerySchema.parse(req.query))));
}

/** GET /api/v1/invoices/utility-sheet */
export async function utilitySheet(req: Request, res: Response) {
  res.json(ok(await utilityService.sheet(currentUser(req), utilitySheetQuerySchema.parse(req.query))));
}

/** POST /api/v1/invoices/utility */
export async function billUtilities(req: Request, res: Response) {
  res.status(201).json(ok(await utilityService.bill(currentUser(req), req.body as BillUtilitiesInput)));
}

/** GET /api/v1/invoices/me */
export async function listMine(req: Request, res: Response) {
  res.json(ok(await invoiceService.listMine(currentUser(req))));
}

/** POST /api/v1/invoices/:id/pay */
export async function pay(req: Request, res: Response) {
  res.status(201).json(ok(await paymentService.pay(currentUser(req), param(req), req.ip ?? '127.0.0.1')));
}

/** GET /api/v1/invoices/:id */
export async function getById(req: Request, res: Response) {
  res.json(ok(await invoiceService.getById(currentUser(req), param(req))));
}

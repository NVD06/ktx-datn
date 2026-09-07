import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { ApiError } from '../../utils/api-error.js';
import type { RegisterInput } from './auth.schema.js';
import * as authService from './auth.service.js';

/** POST /api/v1/auth/register */
export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body as RegisterInput);
  res.status(201).json(ok(user));
}

/**
 * GET /api/v1/auth/me
 *
 * Frontend chỉ gọi endpoint này chứ không đụng trực tiếp /auth/session của
 * Auth.js — vì ở đây mới có `role` và `buildingId` đọc từ database.
 */
export function me(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(ok(req.user));
}

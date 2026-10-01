import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { ApiError } from '../../utils/api-error.js';
import { currentUser } from '../../utils/request.js';
import type { ChangePasswordInput } from './auth.schema.js';
import * as authService from './auth.service.js';

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

/** POST /api/v1/auth/change-password */
export async function changePassword(req: Request, res: Response) {
  res.json(ok(await authService.changePassword(currentUser(req), req.body as ChangePasswordInput)));
}

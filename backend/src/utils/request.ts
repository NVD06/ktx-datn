import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.js';
import { ApiError } from './api-error.js';

/** Người dùng hiện tại. Chỉ gọi trong route đã qua `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

/** Giá trị `:name` trên URL, mặc định `:id`. */
export function param(req: Request, name = 'id'): string {
  const value = req.params[name];
  // Express 5 trả mảng cho tham số wildcard (`*name`); route của ta chỉ dùng `:name`.
  if (typeof value !== 'string' || !value) throw ApiError.notFound();
  return value;
}

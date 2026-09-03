import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isDev } from '../config/env.js';
import type { ErrorResponse } from '../types/response.js';
import { ApiError } from '../utils/api-error.js';

/** Route không khớp — đặt sau tất cả route, trước errorHandler. */
export function notFoundHandler(req: Request, res: Response<ErrorResponse>) {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Không có route ${req.method} ${req.originalUrl}` },
  });
}

/**
 * Nơi duy nhất biến lỗi thành HTTP response.
 * Express 5 tự bắt cả lỗi từ async handler nên không cần wrapper.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Zod lọt tới đây nghĩa là validate ngoài middleware validate() — vẫn trả 400 cho đúng.
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details },
    });
    return;
  }

  console.error('[UNHANDLED]', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      // Chỉ lộ chi tiết lỗi khi dev, tránh rò rỉ thông tin hệ thống ra production.
      message: isDev && err instanceof Error ? err.message : 'Lỗi hệ thống',
    },
  });
}

import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Validate body bằng zod trước khi vào controller.
 * Dữ liệu sau khi parse được gán ngược lại `req.body` — nên controller luôn
 * nhận đúng kiểu đã khai báo, kể cả các trường được zod ép kiểu hoặc set default.
 *
 * ZodError ném ra ở đây sẽ được error-handler bắt và trả về 400 kèm chi tiết
 * lỗi theo từng field.
 */
export function validate<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

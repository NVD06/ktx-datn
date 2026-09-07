import type { NextFunction, Request, Response } from 'express';
import { getUserIdFromRequest } from '../config/auth.js';
import { prisma } from '../config/prisma.js';
import type { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from '../types/auth-user.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Tầng 1 của phân quyền: xác định người gọi là ai.
 *
 * Cố ý query database ở mỗi request thay vì tin vào dữ liệu trong token.
 * Đổi lại một truy vấn theo khóa chính (<1ms), ta được: Admin đổi vai trò
 * hoặc khóa tài khoản là chặn được ngay ở request kế tiếp, không phải chờ
 * phiên hết hạn. Ở quy mô này, đánh đổi đó là xứng đáng.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) throw ApiError.unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, buildingId: true },
  });

  // Tài khoản bị xóa hoặc bị khóa sau khi đã đăng nhập -> phiên mất hiệu lực ngay.
  if (!user || !user.isActive) throw ApiError.unauthorized();

  const { isActive: _isActive, ...authUser } = user;
  req.user = authUser satisfies AuthUser;

  next();
}

/**
 * Tầng 2: vai trò này có được gọi endpoint này không.
 * Dùng sau `requireAuth`.
 *
 * Lưu ý: đây mới chỉ chặn theo vai trò. Việc giới hạn *phạm vi dữ liệu*
 * (Manager chỉ thấy tòa mình) nằm ở service qua `buildingScope()`.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();
    if (!roles.includes(user.role)) throw ApiError.forbidden();
    next();
  };
}

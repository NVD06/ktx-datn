import type { Role } from '../generated/prisma/enums.js';

/**
 * Người dùng đã xác thực, do middleware `requireAuth` đọc từ database
 * và gắn vào `req.user` ở mỗi request.
 *
 * `role` và `buildingId` cố ý KHÔNG lấy từ token mà đọc lại từ DB, để Admin
 * đổi vai trò hoặc khóa tài khoản là có hiệu lực ngay lập tức.
 */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** Chỉ MANAGER mới có giá trị — tòa nhà được gán quản lý. */
  buildingId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

import { authUserSchema } from '../../docs/schemas.js';
import { requireSession } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './auth.controller.js';
import { changePasswordSchema } from './auth.schema.js';

// Không có đăng ký: tài khoản sinh viên do Admin cấp (POST /users/students, /users/students/import).
// Hai route dưới dùng requireSession — vẫn gọi được khi chưa đổi mật khẩu ban đầu.
export const authRoutes = defineRoutes('/auth', 'Auth');

authRoutes.get(
  '/me',
  {
    summary: 'Thông tin người dùng hiện tại',
    description:
      'Có `role` và `buildingId` đọc từ database — frontend dùng endpoint này thay cho /auth/session. ' +
      '`mustChangePassword = true`: đang dùng mật khẩu ban đầu, mọi API khác trả 403 `PASSWORD_CHANGE_REQUIRED`.',
    data: authUserSchema,
    errors: [401],
  },
  requireSession,
  ctrl.me,
);

authRoutes.post(
  '/change-password',
  {
    summary: 'Đổi mật khẩu (mọi vai trò)',
    description:
      'Sai mật khẩu hiện tại, mật khẩu mới trùng mật khẩu hiện tại, hoặc (sinh viên) trùng mã SV -> 400. ' +
      'Đổi xong `mustChangePassword = false`. Trả người dùng hiện tại sau khi đổi.',
    body: changePasswordSchema,
    data: authUserSchema,
    errors: [400, 401],
  },
  requireSession,
  ctrl.changePassword,
);

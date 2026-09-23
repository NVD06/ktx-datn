import { authUserSchema, registeredUserSchema } from '../../docs/schemas.js';
import { requireAuth } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './auth.controller.js';
import { registerSchema } from './auth.schema.js';

export const authRoutes = defineRoutes('/auth', 'Auth');

authRoutes.post(
  '/register',
  {
    summary: 'Đăng ký tài khoản sinh viên',
    description: 'Vai trò luôn là STUDENT, không nhận `role` từ client.',
    public: true,
    body: registerSchema,
    status: 201,
    data: registeredUserSchema,
    errors: [400, 409],
  },
  ctrl.register,
);

authRoutes.get(
  '/me',
  {
    summary: 'Thông tin người dùng hiện tại',
    description:
      'Có `role` và `buildingId` đọc từ database — frontend dùng endpoint này thay cho /auth/session.',
    data: authUserSchema,
    errors: [401],
  },
  requireAuth,
  ctrl.me,
);

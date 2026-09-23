import { userSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './user.controller.js';
import { updateUserSchema, userListQuerySchema } from './user.schema.js';

export const userRoutes = defineRoutes('/users', 'Users', requireAuth, requireRole('ADMIN'));

userRoutes.get(
  '/',
  {
    summary: 'Danh sách người dùng (ADMIN)',
    description: 'Tìm theo họ tên hoặc email. Sắp xếp: fullName, email, createdAt.',
    query: userListQuerySchema,
    paged: userSchema,
    errors: [400, 401, 403],
  },
  ctrl.list,
);

userRoutes.patch(
  '/:id',
  {
    summary: 'Gán quản lý vào tòa nhà (ADMIN)',
    description: 'Người dùng không phải MANAGER, hoặc gán tài khoản đang bị khóa -> 409.',
    body: updateUserSchema,
    data: userSchema,
    errors: [400, 401, 403, 404, 409],
  },
  ctrl.update,
);

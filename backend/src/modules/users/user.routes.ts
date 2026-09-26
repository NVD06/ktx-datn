import { userSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './user.controller.js';
import { createManagerSchema, updateUserSchema, userListQuerySchema } from './user.schema.js';

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

userRoutes.post(
  '/',
  {
    summary: 'Tạo tài khoản quản lý (ADMIN)',
    description:
      'Vai trò luôn là MANAGER (không nhận `role` từ client). Email trùng -> 409 `EMAIL_TAKEN`. `buildingId` ' +
      '(không bắt buộc) phải là tòa đang hoạt động và chưa có quản lý -> 409 `BUILDING_INACTIVE` / ' +
      '`BUILDING_HAS_MANAGER`. Người quản lý đăng nhập được ngay bằng mật khẩu ban đầu.',
    body: createManagerSchema,
    status: 201,
    data: userSchema,
    errors: [400, 401, 403, 409],
  },
  ctrl.createManager,
);

userRoutes.patch(
  '/:id',
  {
    summary: 'Gán tòa cho quản lý / khóa, mở khóa tài khoản (ADMIN)',
    description:
      '`buildingId`: Manager ↔ tòa là quan hệ 1–1 — gán sang tòa khác là chuyển tòa; tòa đã có quản lý ' +
      'khác -> 409 `BUILDING_HAS_MANAGER` (gỡ người cũ bằng `buildingId: null` trước); người dùng không ' +
      'phải MANAGER hoặc đang bị khóa -> 409. `isActive: false` khóa tài khoản, có hiệu lực từ request kế ' +
      'tiếp (401); tự khóa chính mình -> 409 `CANNOT_LOCK_SELF`.',
    body: updateUserSchema,
    data: userSchema,
    errors: [400, 401, 403, 404, 409],
  },
  ctrl.update,
);

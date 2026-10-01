import { z } from 'zod';
import { deletedSchema, userSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './user.controller.js';
import {
  createManagerSchema,
  importStudentsSchema,
  studentAccountSchema,
  updateUserSchema,
  userListQuerySchema,
} from './user.schema.js';

export const userRoutes = defineRoutes('/users', 'Users', requireAuth, requireRole('ADMIN'));

userRoutes.get(
  '/',
  {
    summary: 'Danh sách người dùng (ADMIN)',
    description: 'Tìm theo họ tên, email hoặc mã sinh viên. Sắp xếp: fullName, email, createdAt.',
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

userRoutes.post(
  '/students',
  {
    summary: 'Cấp tài khoản sinh viên (ADMIN)',
    description:
      'Sinh viên không tự đăng ký. Mật khẩu ban đầu là mã SV, `mustChangePassword = true`: lần đăng nhập đầu ' +
      'phải đổi mật khẩu. Email hoặc mã SV đã có tài khoản -> 409 `ACCOUNT_EXISTS` (lỗi theo trường).',
    body: studentAccountSchema,
    status: 201,
    data: userSchema,
    errors: [400, 401, 403, 409],
  },
  ctrl.createStudent,
);

userRoutes.post(
  '/students/import',
  {
    summary: 'Nhập danh sách sinh viên từ file Excel (ADMIN)',
    description:
      'Tất cả hoặc không: còn dòng lỗi (sai định dạng, trùng trong file, email / mã SV đã thuộc tài khoản khác) ' +
      'thì không tạo gì, 400 với lỗi theo `rows.<vị trí>.<trường>`. Dòng đã có đúng tài khoản đó thì bỏ qua ' +
      '(`skipped`). `dryRun: true` chỉ kiểm tra — `created` là số tài khoản sẽ tạo.',
    body: importStudentsSchema,
    data: z.object({ dryRun: z.boolean(), created: z.int(), skipped: z.int() }).openapi('ImportStudentsResult'),
    errors: [400, 401, 403, 409],
  },
  ctrl.importStudents,
);

userRoutes.post(
  '/:id/reset-password',
  {
    summary: 'Đặt lại mật khẩu sinh viên về mã SV (ADMIN)',
    description: 'Sinh viên phải đổi mật khẩu ở lần đăng nhập kế tiếp. Không phải tài khoản sinh viên -> 409.',
    data: userSchema,
    errors: [401, 403, 404, 409],
  },
  ctrl.resetPassword,
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

userRoutes.delete(
  '/:id',
  {
    summary: 'Xóa tài khoản (ADMIN)',
    description:
      'Chỉ tài khoản chưa có lịch sử nghiệp vụ (cấp nhầm, nhập Excel sai). Đã có đơn đăng ký, yêu cầu sửa chữa, ' +
      'hoặc từng duyệt đơn / chấm dứt hợp đồng / xử lý sửa chữa / chấm vệ sinh -> 409 `USER_HAS_HISTORY` (khóa ' +
      'tài khoản thay vì xóa). Tự xóa mình -> 409 `CANNOT_DELETE_SELF`; tài khoản ADMIN -> 409 ' +
      '`CANNOT_DELETE_ADMIN`. Quản lý đang gán tòa thì tòa trống quản lý.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  ctrl.remove,
);

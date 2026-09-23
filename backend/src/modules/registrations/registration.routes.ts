import { z } from 'zod';
import { registrationListItemSchema, registrationSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './registration.controller.js';
import { createRegistrationSchema, registrationListQuerySchema } from './registration.schema.js';

// Không chặn vai trò chung: sinh viên nộp/hủy đơn, ADMIN/MANAGER xem danh sách.
export const registrationRoutes = defineRoutes('/registrations', 'Registrations', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

registrationRoutes.get(
  '/',
  {
    summary: 'Danh sách đơn để duyệt (ADMIN, MANAGER)',
    description:
      'ADMIN thấy mọi đơn. MANAGER thấy đơn nguyện vọng vào tòa mình và đơn "tòa nào cũng được" ' +
      'của sinh viên hợp giới tính tòa (tòa hỗn hợp: mọi sinh viên). `search` tìm theo tên, email, ' +
      'mã sinh viên. Sắp xếp: createdAt, status. Mặc định createdAt giảm dần.',
    query: registrationListQuerySchema,
    paged: registrationListItemSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

registrationRoutes.get(
  '/me',
  {
    summary: 'Đơn đăng ký của tôi (STUDENT)',
    description: 'Mọi đơn qua các đợt, mới nhất trước. Không phân trang.',
    data: z.array(registrationSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

registrationRoutes.post(
  '/',
  {
    summary: 'Nộp đơn đăng ký ở (STUDENT)',
    description:
      'Nộp vào đợt đang mở. 409 khi: không có đợt mở (`PERIOD_CLOSED`) · hồ sơ chưa đủ (`PROFILE_INCOMPLETE`) · ' +
      'đã có đơn PENDING/APPROVED trong đợt (`REGISTRATION_EXISTS`) · có hợp đồng DRAFT/ACTIVE trùng thời gian ở ' +
      'của đợt (`CONTRACT_OVERLAP`). 400 khi tòa khác giới tính / ngừng hoạt động, loại phòng ngừng sử dụng, ' +
      'hoặc tòa đã chọn không có loại phòng đã chọn.',
    body: createRegistrationSchema,
    status: 201,
    data: registrationSchema,
    errors: [400, 401, 403, 404, 409],
  },
  student,
  ctrl.create,
);

registrationRoutes.post(
  '/:id/cancel',
  {
    summary: 'Hủy đơn của tôi (STUDENT)',
    description: 'Chỉ khi đơn còn PENDING, nếu không -> 409 `REGISTRATION_NOT_PENDING`.',
    data: registrationSchema,
    errors: [401, 403, 404, 409],
  },
  student,
  ctrl.cancel,
);

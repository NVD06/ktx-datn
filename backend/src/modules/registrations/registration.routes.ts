import { z } from 'zod';
import {
  approvedContractSchema,
  registrationListItemSchema,
  registrationSchema,
} from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './registration.controller.js';
import {
  approveRegistrationSchema,
  createRegistrationSchema,
  registrationListQuerySchema,
  rejectRegistrationSchema,
} from './registration.schema.js';

// Không chặn vai trò chung: sinh viên nộp/hủy đơn, ADMIN/MANAGER xem, duyệt, từ chối.
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

registrationRoutes.post(
  '/:id/approve',
  {
    summary: 'Duyệt đơn: xếp giường, sinh hợp đồng DRAFT (ADMIN, MANAGER)',
    description:
      'Đơn phải PENDING và thuộc phạm vi người duyệt (như GET /registrations). Giường chọn từ ' +
      'GET /beds/available; MANAGER chỉ xếp giường tòa mình. Đơn có nguyện vọng tòa thì giường ' +
      'phải thuộc tòa đó (400); nguyện vọng loại phòng chỉ để tham khảo. Hợp đồng DRAFT: mã ' +
      '`HD-YYYY-XXXX`, giá snapshot từ loại phòng, kỳ hạn = thời gian ở của đợt. 409 khi: đơn ' +
      'không còn PENDING (`REGISTRATION_NOT_PENDING`) · giường vừa bị lấy (`BED_TAKEN`) · phòng ' +
      'ngừng hoạt động (`ROOM_UNAVAILABLE`) · phòng không hợp giới tính (`ROOM_GENDER_MISMATCH`) · ' +
      'SV đã có hợp đồng trùng thời gian ở (`CONTRACT_OVERLAP`).',
    body: approveRegistrationSchema,
    data: approvedContractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.approve,
);

registrationRoutes.post(
  '/:id/reject',
  {
    summary: 'Từ chối đơn kèm lý do (ADMIN, MANAGER)',
    description:
      'Đơn phải PENDING và thuộc phạm vi người duyệt, nếu không -> 409 `REGISTRATION_NOT_PENDING`. ' +
      '`reviewNote` bắt buộc — sinh viên thấy lý do trong "Đơn của tôi".',
    body: rejectRegistrationSchema,
    data: registrationListItemSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.reject,
);

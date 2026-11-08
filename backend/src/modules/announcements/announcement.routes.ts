import { z } from 'zod';
import { announcementSchema, deletedSchema, myAnnouncementSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './announcement.controller.js';
import { announcementInputSchema, announcementListQuerySchema } from './announcement.schema.js';

export const announcementRoutes = defineRoutes('/announcements', 'Announcements', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

announcementRoutes.get(
  '/',
  {
    summary: 'Danh sách thông báo (ADMIN, MANAGER)',
    description: 'MANAGER thấy tin toàn KTX và tin của tòa mình. `search` tìm theo tiêu đề. Mặc định mới nhất trước.',
    query: announcementListQuerySchema,
    paged: announcementSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

announcementRoutes.get(
  '/me',
  {
    summary: 'Thông báo của tôi (STUDENT)',
    description: 'Tin toàn KTX và tin của tòa đang ở, tin ghim trước rồi mới nhất trước, tối đa 100 tin. `readAt` null là chưa đọc.',
    data: z.array(myAnnouncementSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

announcementRoutes.post(
  '/',
  {
    summary: 'Đăng thông báo (ADMIN, MANAGER)',
    description: 'ADMIN chọn toàn KTX (`buildingId: null`) hoặc một tòa. MANAGER luôn đăng cho tòa mình.',
    body: announcementInputSchema,
    data: announcementSchema,
    status: 201,
    errors: [400, 401, 403, 404],
  },
  staff,
  ctrl.create,
);

announcementRoutes.patch(
  '/:id',
  {
    summary: 'Sửa thông báo (ADMIN, MANAGER)',
    description: 'MANAGER chỉ sửa tin của tòa mình; tin toàn KTX hoặc tòa khác -> 403.',
    body: announcementInputSchema,
    data: announcementSchema,
    errors: [400, 401, 403, 404],
  },
  staff,
  ctrl.update,
);

announcementRoutes.delete(
  '/:id',
  {
    summary: 'Xóa thông báo (ADMIN, MANAGER)',
    description: 'MANAGER chỉ xóa tin của tòa mình; tin toàn KTX hoặc tòa khác -> 403.',
    data: deletedSchema,
    errors: [401, 403, 404],
  },
  staff,
  ctrl.remove,
);

announcementRoutes.post(
  '/:id/read',
  {
    summary: 'Đánh dấu đã đọc (STUDENT)',
    description: 'Chỉ tin SV được xem; đọc lại không đổi thời điểm đọc đầu tiên.',
    data: deletedSchema,
    errors: [401, 403, 404],
  },
  student,
  ctrl.markRead,
);

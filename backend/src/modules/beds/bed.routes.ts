import { z } from 'zod';
import { availableRoomSchema, bedSchema, deletedSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './bed.controller.js';
import { availableBedQuerySchema, updateBedSchema } from './bed.schema.js';

// Thêm giường nằm ở POST /rooms/:id/beds (room.routes.ts) vì cần biết phòng.
export const bedRoutes = defineRoutes('/beds', 'Beds', requireAuth, requireRole('ADMIN', 'MANAGER'));

bedRoutes.get(
  '/available',
  {
    summary: 'Giường còn xếp được cho một sinh viên, gom theo phòng (duyệt đơn)',
    description:
      'Phòng/tòa/loại phòng đang hoạt động, thuộc tòa cùng giới tính `gender`, giường chưa có người và ' +
      'chưa bị hợp đồng DRAFT giữ chỗ. ' +
      'MANAGER chỉ thấy tòa mình. Không phân trang.',
    query: availableBedQuerySchema,
    data: z.array(availableRoomSchema),
    errors: [400, 401, 403],
  },
  ctrl.available,
);

bedRoutes.patch(
  '/:id',
  {
    summary: 'Sửa giường / đổi trạng thái AVAILABLE ↔ MAINTENANCE',
    description: 'Giường đang OCCUPIED không đổi được trạng thái (409).',
    body: updateBedSchema,
    data: bedSchema,
    errors: [400, 401, 403, 404, 409],
  },
  ctrl.update,
);

bedRoutes.delete(
  '/:id',
  {
    summary: 'Xóa giường',
    description: 'Giường đang OCCUPIED hoặc đã có hợp đồng -> 409.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  ctrl.remove,
);

import { deletedSchema, roomTypeSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './room-type.controller.js';
import {
  createRoomTypeSchema,
  roomTypeListQuerySchema,
  updateRoomTypeSchema,
} from './room-type.schema.js';

// Danh mục dùng chung: MANAGER chỉ đọc, chỉ ADMIN được ghi.
export const roomTypeRoutes = defineRoutes(
  '/room-types',
  'Room types',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
);
const admin = requireRole('ADMIN');

roomTypeRoutes.get(
  '/',
  {
    summary: 'Danh sách loại phòng',
    description: 'Sắp xếp: name, capacity, price, createdAt.',
    query: roomTypeListQuerySchema,
    paged: roomTypeSchema,
    errors: [400, 401, 403],
  },
  ctrl.list,
);

roomTypeRoutes.post(
  '/',
  {
    summary: 'Tạo loại phòng (ADMIN)',
    body: createRoomTypeSchema,
    status: 201,
    data: roomTypeSchema,
    errors: [400, 401, 403, 409],
  },
  admin,
  ctrl.create,
);

roomTypeRoutes.get(
  '/:id',
  { summary: 'Chi tiết loại phòng', data: roomTypeSchema, errors: [401, 403, 404] },
  ctrl.getById,
);

roomTypeRoutes.patch(
  '/:id',
  {
    summary: 'Sửa loại phòng (ADMIN)',
    description:
      'Giảm `capacity` xuống dưới số giường của một phòng đang dùng loại này -> 409. ' +
      'Đổi `price` không ảnh hưởng hợp đồng đã ký.',
    body: updateRoomTypeSchema,
    data: roomTypeSchema,
    errors: [400, 401, 403, 404, 409],
  },
  admin,
  ctrl.update,
);

roomTypeRoutes.delete(
  '/:id',
  {
    summary: 'Xóa loại phòng (ADMIN)',
    description:
      'Loại phòng đang có phòng dùng hoặc có đơn đăng ký chọn -> 409, dùng PATCH `isActive: false`.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  admin,
  ctrl.remove,
);

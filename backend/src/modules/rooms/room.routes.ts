import { z } from 'zod';
import {
  availableSummarySchema,
  bedSchema,
  deletedSchema,
  roomDetailSchema,
  roomSchema,
} from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as bedCtrl from '../beds/bed.controller.js';
import { createBedSchema } from '../beds/bed.schema.js';
import * as ctrl from './room.controller.js';
import { createRoomSchema, roomListQuerySchema, updateRoomSchema } from './room.schema.js';

// Không chặn vai trò chung cho cả router: /rooms/available dành cho sinh viên.
export const roomRoutes = defineRoutes('/rooms', 'Rooms', requireAuth);
const staff = requireRole('ADMIN', 'MANAGER');

// Khai báo TRƯỚC '/:id', nếu không Express hiểu "available" là một id.
roomRoutes.get(
  '/available/summary',
  {
    summary: 'Chỗ trống theo tòa × loại phòng (mọi vai trò)',
    description:
      'Phòng, tòa, loại phòng đang hoạt động, còn giường trống (giường bị hợp đồng DRAFT giữ chỗ không tính), ' +
      'gom theo tòa × loại phòng. STUDENT chỉ thấy phòng ở tòa cùng giới tính, hoặc phòng ở tòa hỗn hợp ' +
      'chưa có người khác giới. Sinh viên dùng để chọn nguyện vọng khi nộp đơn.',
    data: z.array(availableSummarySchema),
    errors: [401],
  },
  ctrl.availableSummary,
);

roomRoutes.get(
  '/',
  {
    summary: 'Danh sách phòng',
    description:
      'ADMIN thấy tất cả; MANAGER chỉ thấy phòng thuộc tòa được gán. ' +
      'Lọc theo tòa, tầng, loại phòng, trạng thái. Sắp xếp: code, floor, createdAt.',
    query: roomListQuerySchema,
    paged: roomSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

roomRoutes.post(
  '/',
  {
    summary: 'Tạo phòng',
    description:
      'Tự sinh giường G1..Gn theo sức chứa của loại phòng. MANAGER chỉ tạo được trong tòa được gán.',
    body: createRoomSchema,
    status: 201,
    data: roomDetailSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.create,
);

roomRoutes.get(
  '/:id',
  { summary: 'Chi tiết phòng kèm danh sách giường', data: roomDetailSchema, errors: [401, 403, 404] },
  staff,
  ctrl.getById,
);

roomRoutes.patch(
  '/:id',
  {
    summary: 'Sửa phòng',
    body: updateRoomSchema,
    data: roomDetailSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.update,
);

roomRoutes.delete(
  '/:id',
  {
    summary: 'Xóa phòng',
    description:
      'Phòng đã có hợp đồng hoặc lịch sử sửa chữa/vệ sinh -> 409, dùng PATCH `isActive: false`.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  staff,
  ctrl.remove,
);

roomRoutes.post(
  '/:id/beds',
  {
    summary: 'Thêm giường vào phòng',
    description: 'Số giường không được vượt sức chứa của loại phòng (409).',
    tags: ['Beds'],
    body: createBedSchema,
    status: 201,
    data: bedSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  bedCtrl.create,
);

import { buildingSchema, deletedSchema, roomSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as roomCtrl from '../rooms/room.controller.js';
import { buildingRoomListQuerySchema } from '../rooms/room.schema.js';
import * as ctrl from './building.controller.js';
import {
  buildingListQuerySchema,
  createBuildingSchema,
  updateBuildingSchema,
} from './building.schema.js';

// Sinh viên không quản lý tòa nhà -> chỉ ADMIN và MANAGER được vào.
export const buildingRoutes = defineRoutes(
  '/buildings',
  'Buildings',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
);
const admin = requireRole('ADMIN');

buildingRoutes.get(
  '/',
  {
    summary: 'Danh sách tòa nhà',
    description: 'ADMIN thấy tất cả; MANAGER chỉ thấy tòa được gán. Sắp xếp: name, floors, createdAt.',
    query: buildingListQuerySchema,
    paged: buildingSchema,
    errors: [400, 401, 403],
  },
  ctrl.list,
);

buildingRoutes.post(
  '/',
  {
    summary: 'Tạo tòa nhà (ADMIN)',
    body: createBuildingSchema,
    status: 201,
    data: buildingSchema,
    errors: [400, 401, 403, 409],
  },
  admin,
  ctrl.create,
);

buildingRoutes.get(
  '/:id',
  { summary: 'Chi tiết tòa nhà', data: buildingSchema, errors: [401, 403, 404] },
  ctrl.getById,
);

buildingRoutes.patch(
  '/:id',
  {
    summary: 'Sửa tòa nhà (ADMIN)',
    description:
      'Không cho giảm số tầng xuống dưới tầng cao nhất đang có phòng (409). ' +
      'Không cho chuyển tòa sang một giới tính khi còn sinh viên khác giới đang ở hoặc có đơn chờ duyệt (409).',
    body: updateBuildingSchema,
    data: buildingSchema,
    errors: [400, 401, 403, 404, 409],
  },
  admin,
  ctrl.update,
);

buildingRoutes.delete(
  '/:id',
  {
    summary: 'Xóa tòa nhà (ADMIN)',
    description:
      'Chỉ xóa được tòa chưa có phòng, chưa gán quản lý và chưa có đơn đăng ký chọn. Ngược lại trả 409 kèm lý do — ' +
      'dùng PATCH `isActive: false` để ngừng hoạt động.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  admin,
  ctrl.remove,
);

buildingRoutes.get(
  '/:id/rooms',
  {
    summary: 'Danh sách phòng của một tòa',
    description: 'MANAGER gọi với tòa không được gán -> 403. Sắp xếp: code, floor, createdAt.',
    tags: ['Rooms'],
    query: buildingRoomListQuerySchema,
    paged: roomSchema,
    errors: [400, 401, 403, 404],
  },
  roomCtrl.listByBuilding,
);

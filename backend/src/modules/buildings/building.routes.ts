import { Router } from 'express';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
} from '../../config/openapi.js';
import { buildingSchema, deletedSchema, roomSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as roomCtrl from '../rooms/room.controller.js';
import { buildingRoomListQuerySchema } from '../rooms/room.schema.js';
import * as ctrl from './building.controller.js';
import {
  buildingListQuerySchema,
  createBuildingSchema,
  updateBuildingSchema,
} from './building.schema.js';

export const buildingRoutes = Router();

// Sinh viên không quản lý tòa nhà -> chỉ ADMIN và MANAGER được vào.
buildingRoutes.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/buildings',
  tags: ['Buildings'],
  summary: 'Danh sách tòa nhà',
  description: 'ADMIN thấy tất cả; MANAGER chỉ thấy tòa được gán. Sắp xếp: name, floors, createdAt.',
  security,
  request: { query: buildingListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(buildingSchema)),
    ...errorResponses(400, 401, 403),
  },
});
buildingRoutes.get('/', ctrl.list);

registry.registerPath({
  method: 'post',
  path: '/buildings',
  tags: ['Buildings'],
  summary: 'Tạo tòa nhà (ADMIN)',
  security,
  request: { body: jsonBody(createBuildingSchema) },
  responses: {
    201: okResponse('Đã tạo', okSchema(buildingSchema)),
    ...errorResponses(400, 401, 403, 409),
  },
});
buildingRoutes.post('/', requireRole('ADMIN'), validate(createBuildingSchema), ctrl.create);

registry.registerPath({
  method: 'get',
  path: '/buildings/{id}',
  tags: ['Buildings'],
  summary: 'Chi tiết tòa nhà',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Tòa nhà', okSchema(buildingSchema)),
    ...errorResponses(401, 403, 404),
  },
});
buildingRoutes.get('/:id', ctrl.getById);

registry.registerPath({
  method: 'patch',
  path: '/buildings/{id}',
  tags: ['Buildings'],
  summary: 'Sửa tòa nhà (ADMIN)',
  description: 'Không cho giảm số tầng xuống dưới tầng cao nhất đang có phòng (409).',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateBuildingSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(buildingSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
buildingRoutes.patch('/:id', requireRole('ADMIN'), validate(updateBuildingSchema), ctrl.update);

registry.registerPath({
  method: 'delete',
  path: '/buildings/{id}',
  tags: ['Buildings'],
  summary: 'Xóa tòa nhà (ADMIN)',
  description:
    'Chỉ xóa được tòa chưa có phòng và chưa gán quản lý. Ngược lại trả 409 kèm lý do — ' +
    'dùng PATCH `isActive: false` để ngừng hoạt động.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã xóa', okSchema(deletedSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
buildingRoutes.delete('/:id', requireRole('ADMIN'), ctrl.remove);

registry.registerPath({
  method: 'get',
  path: '/buildings/{id}/rooms',
  tags: ['Buildings', 'Rooms'],
  summary: 'Danh sách phòng của một tòa',
  description: 'MANAGER gọi với tòa không được gán -> 403. Sắp xếp: code, floor, createdAt.',
  security,
  request: { params: idParamsSchema, query: buildingRoomListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(roomSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
buildingRoutes.get('/:id/rooms', roomCtrl.listByBuilding);

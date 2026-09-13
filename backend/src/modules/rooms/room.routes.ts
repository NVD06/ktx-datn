import { Router } from 'express';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
} from '../../config/openapi.js';
import {
  availableRoomSchema,
  bedSchema,
  deletedSchema,
  roomDetailSchema,
  roomSchema,
} from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as bedCtrl from '../beds/bed.controller.js';
import { createBedSchema } from '../beds/bed.schema.js';
import * as ctrl from './room.controller.js';
import {
  availableRoomQuerySchema,
  createRoomSchema,
  roomListQuerySchema,
  updateRoomSchema,
} from './room.schema.js';

export const roomRoutes = Router();

// Không chặn vai trò chung cho cả router: /rooms/available dành cho sinh viên.
roomRoutes.use(requireAuth);
const staff = requireRole('ADMIN', 'MANAGER');

const security = [{ cookieAuth: [] }];

// Khai báo TRƯỚC '/:id', nếu không Express hiểu "available" là một id.
registry.registerPath({
  method: 'get',
  path: '/rooms/available',
  tags: ['Rooms'],
  summary: 'Phòng còn chỗ (mọi vai trò)',
  description:
    'Chỉ gồm phòng, tòa và loại phòng đang hoạt động, còn ít nhất 1 giường trống. ' +
    'Không trả thông tin giường hay người ở.',
  security,
  request: { query: availableRoomQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(availableRoomSchema)),
    ...errorResponses(400, 401),
  },
});
roomRoutes.get('/available', ctrl.listAvailable);

registry.registerPath({
  method: 'get',
  path: '/rooms',
  tags: ['Rooms'],
  summary: 'Danh sách phòng',
  description:
    'ADMIN thấy tất cả; MANAGER chỉ thấy phòng thuộc tòa được gán. ' +
    'Lọc theo tòa, tầng, loại phòng, trạng thái. Sắp xếp: code, floor, createdAt.',
  security,
  request: { query: roomListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(roomSchema)),
    ...errorResponses(400, 401, 403),
  },
});
roomRoutes.get('/', staff, ctrl.list);

registry.registerPath({
  method: 'post',
  path: '/rooms',
  tags: ['Rooms'],
  summary: 'Tạo phòng',
  description:
    'Tự sinh giường G1..Gn theo sức chứa của loại phòng. MANAGER chỉ tạo được trong tòa được gán.',
  security,
  request: { body: jsonBody(createRoomSchema) },
  responses: {
    201: okResponse('Đã tạo', okSchema(roomDetailSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
roomRoutes.post('/', staff, validate(createRoomSchema), ctrl.create);

registry.registerPath({
  method: 'get',
  path: '/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Chi tiết phòng kèm danh sách giường',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Phòng', okSchema(roomDetailSchema)),
    ...errorResponses(401, 403, 404),
  },
});
roomRoutes.get('/:id', staff, ctrl.getById);

registry.registerPath({
  method: 'patch',
  path: '/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Sửa phòng',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateRoomSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(roomDetailSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
roomRoutes.patch('/:id', staff, validate(updateRoomSchema), ctrl.update);

registry.registerPath({
  method: 'delete',
  path: '/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Xóa phòng',
  description:
    'Phòng đã có hợp đồng hoặc lịch sử sửa chữa/vệ sinh -> 409, dùng PATCH `isActive: false`.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã xóa', okSchema(deletedSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
roomRoutes.delete('/:id', staff, ctrl.remove);

registry.registerPath({
  method: 'post',
  path: '/rooms/{id}/beds',
  tags: ['Rooms', 'Beds'],
  summary: 'Thêm giường vào phòng',
  description: 'Số giường không được vượt sức chứa của loại phòng (409).',
  security,
  request: { params: idParamsSchema, body: jsonBody(createBedSchema) },
  responses: {
    201: okResponse('Đã tạo', okSchema(bedSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
roomRoutes.post('/:id/beds', staff, validate(createBedSchema), bedCtrl.create);

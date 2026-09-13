import { Router } from 'express';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
} from '../../config/openapi.js';
import { deletedSchema, roomTypeSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as ctrl from './room-type.controller.js';
import {
  createRoomTypeSchema,
  roomTypeListQuerySchema,
  updateRoomTypeSchema,
} from './room-type.schema.js';

export const roomTypeRoutes = Router();

// Danh mục dùng chung: MANAGER chỉ đọc, chỉ ADMIN được ghi.
roomTypeRoutes.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/room-types',
  tags: ['Room types'],
  summary: 'Danh sách loại phòng',
  description: 'Sắp xếp: name, capacity, price, createdAt.',
  security,
  request: { query: roomTypeListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(roomTypeSchema)),
    ...errorResponses(400, 401, 403),
  },
});
roomTypeRoutes.get('/', ctrl.list);

registry.registerPath({
  method: 'post',
  path: '/room-types',
  tags: ['Room types'],
  summary: 'Tạo loại phòng (ADMIN)',
  security,
  request: { body: jsonBody(createRoomTypeSchema) },
  responses: {
    201: okResponse('Đã tạo', okSchema(roomTypeSchema)),
    ...errorResponses(400, 401, 403, 409),
  },
});
roomTypeRoutes.post('/', requireRole('ADMIN'), validate(createRoomTypeSchema), ctrl.create);

registry.registerPath({
  method: 'get',
  path: '/room-types/{id}',
  tags: ['Room types'],
  summary: 'Chi tiết loại phòng',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Loại phòng', okSchema(roomTypeSchema)),
    ...errorResponses(401, 403, 404),
  },
});
roomTypeRoutes.get('/:id', ctrl.getById);

registry.registerPath({
  method: 'patch',
  path: '/room-types/{id}',
  tags: ['Room types'],
  summary: 'Sửa loại phòng (ADMIN)',
  description:
    'Giảm `capacity` xuống dưới số giường của một phòng đang dùng loại này -> 409. ' +
    'Đổi `price` không ảnh hưởng hợp đồng đã ký.',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateRoomTypeSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(roomTypeSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
roomTypeRoutes.patch('/:id', requireRole('ADMIN'), validate(updateRoomTypeSchema), ctrl.update);

registry.registerPath({
  method: 'delete',
  path: '/room-types/{id}',
  tags: ['Room types'],
  summary: 'Xóa loại phòng (ADMIN)',
  description: 'Loại phòng đang có phòng dùng hoặc có đơn đăng ký chọn -> 409, dùng PATCH `isActive: false`.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã xóa', okSchema(deletedSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
roomTypeRoutes.delete('/:id', requireRole('ADMIN'), ctrl.remove);

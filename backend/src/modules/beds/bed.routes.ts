import { Router } from 'express';
import { errorResponses, jsonBody, okResponse, okSchema, registry } from '../../config/openapi.js';
import { bedSchema, deletedSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as ctrl from './bed.controller.js';
import { updateBedSchema } from './bed.schema.js';

// Thêm giường nằm ở POST /rooms/:id/beds (room.routes.ts) vì cần biết phòng.
export const bedRoutes = Router();

bedRoutes.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'patch',
  path: '/beds/{id}',
  tags: ['Beds'],
  summary: 'Sửa giường / đổi trạng thái AVAILABLE ↔ MAINTENANCE',
  description: 'Giường đang OCCUPIED không đổi được trạng thái (409).',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateBedSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(bedSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
bedRoutes.patch('/:id', validate(updateBedSchema), ctrl.update);

registry.registerPath({
  method: 'delete',
  path: '/beds/{id}',
  tags: ['Beds'],
  summary: 'Xóa giường',
  description: 'Giường đang OCCUPIED hoặc đã có hợp đồng -> 409.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã xóa', okSchema(deletedSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
bedRoutes.delete('/:id', ctrl.remove);

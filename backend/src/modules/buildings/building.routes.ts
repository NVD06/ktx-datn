import { Router } from 'express';
import { errorResponses, okResponse, pagedSchema, registry } from '../../config/openapi.js';
import { buildingSchema, listQuerySchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import * as ctrl from './building.controller.js';

export const buildingRoutes = Router();

// Sinh viên không quản lý tòa nhà -> chỉ ADMIN và MANAGER được vào.
buildingRoutes.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

registry.registerPath({
  method: 'get',
  path: '/buildings',
  tags: ['Buildings'],
  summary: 'Danh sách tòa nhà',
  description: 'ADMIN thấy tất cả; MANAGER chỉ thấy tòa được gán.',
  security: [{ cookieAuth: [] }],
  request: { query: listQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(buildingSchema)),
    ...errorResponses(401, 403),
  },
});
buildingRoutes.get('/', ctrl.list);

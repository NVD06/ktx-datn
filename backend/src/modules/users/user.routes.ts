import { Router } from 'express';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
} from '../../config/openapi.js';
import { userSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as ctrl from './user.controller.js';
import { updateUserSchema, userListQuerySchema } from './user.schema.js';

export const userRoutes = Router();

userRoutes.use(requireAuth, requireRole('ADMIN'));

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/users',
  tags: ['Users'],
  summary: 'Danh sách người dùng (ADMIN)',
  description: 'Tìm theo họ tên hoặc email. Sắp xếp: fullName, email, createdAt.',
  security,
  request: { query: userListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(userSchema)),
    ...errorResponses(400, 401, 403),
  },
});
userRoutes.get('/', ctrl.list);

registry.registerPath({
  method: 'patch',
  path: '/users/{id}',
  tags: ['Users'],
  summary: 'Gán quản lý vào tòa nhà (ADMIN)',
  description: 'Người dùng không phải MANAGER -> 409.',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateUserSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(userSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
userRoutes.patch('/:id', validate(updateUserSchema), ctrl.update);

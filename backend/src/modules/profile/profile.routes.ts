import { Router } from 'express';
import { errorResponses, jsonBody, okResponse, okSchema, registry } from '../../config/openapi.js';
import { studentProfileSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './profile.controller.js';
import { updateProfileSchema } from './profile.schema.js';

export const profileRoutes = Router();

// Hồ sơ của chính sinh viên đang đăng nhập — không có :id.
profileRoutes.use(requireAuth, requireRole('STUDENT'));

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/profile',
  tags: ['Profile'],
  summary: 'Hồ sơ của tôi (STUDENT)',
  description: '`isComplete = false` thì chưa nộp được đơn đăng ký; `missingFields` liệt kê trường còn thiếu.',
  security,
  responses: {
    200: okResponse('Hồ sơ', okSchema(studentProfileSchema)),
    ...errorResponses(401, 403, 404),
  },
});
profileRoutes.get('/', ctrl.get);

registry.registerPath({
  method: 'patch',
  path: '/profile',
  tags: ['Profile'],
  summary: 'Cập nhật hồ sơ của tôi (STUDENT)',
  description: 'Không sửa được mã sinh viên và giới tính. Gửi `null` để xóa một trường.',
  security,
  request: { body: jsonBody(updateProfileSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(studentProfileSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
profileRoutes.patch('/', validate(updateProfileSchema), ctrl.update);

import { Router } from 'express';
import { z } from 'zod';
import { errorResponses, jsonBody, okResponse, okSchema, registry } from '../../config/openapi.js';
import { registrationSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as ctrl from './registration.controller.js';
import { createRegistrationSchema } from './registration.schema.js';

export const registrationRoutes = Router();

// Không chặn vai trò chung: US-02.4 thêm GET /registrations cho Manager.
registrationRoutes.use(requireAuth);
const student = requireRole('STUDENT');

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/registrations/me',
  tags: ['Registrations'],
  summary: 'Đơn đăng ký của tôi (STUDENT)',
  description: 'Mọi đơn qua các đợt, mới nhất trước. Không phân trang.',
  security,
  responses: {
    200: okResponse('Danh sách đơn', okSchema(z.array(registrationSchema))),
    ...errorResponses(401, 403),
  },
});
registrationRoutes.get('/me', student, ctrl.listMine);

registry.registerPath({
  method: 'post',
  path: '/registrations',
  tags: ['Registrations'],
  summary: 'Nộp đơn đăng ký ở (STUDENT)',
  description:
    'Nộp vào đợt đang mở. 409 khi: không có đợt mở (`PERIOD_CLOSED`) · hồ sơ chưa đủ (`PROFILE_INCOMPLETE`) · ' +
    'đã có đơn PENDING/APPROVED trong đợt (`REGISTRATION_EXISTS`) · có hợp đồng DRAFT/ACTIVE trùng thời gian ở ' +
    'của đợt (`CONTRACT_OVERLAP`). 400 khi tòa khác giới tính / ngừng hoạt động, loại phòng ngừng sử dụng, ' +
    'hoặc tòa đã chọn không có loại phòng đã chọn.',
  security,
  request: { body: jsonBody(createRegistrationSchema) },
  responses: {
    201: okResponse('Đã nộp', okSchema(registrationSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
registrationRoutes.post('/', student, validate(createRegistrationSchema), ctrl.create);

registry.registerPath({
  method: 'post',
  path: '/registrations/{id}/cancel',
  tags: ['Registrations'],
  summary: 'Hủy đơn của tôi (STUDENT)',
  description: 'Chỉ khi đơn còn PENDING, nếu không -> 409 `REGISTRATION_NOT_PENDING`.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã hủy', okSchema(registrationSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
registrationRoutes.post('/:id/cancel', student, ctrl.cancel);

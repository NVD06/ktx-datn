import { Router } from 'express';
import { errorResponses, okResponse, okSchema, registry } from '../../config/openapi.js';
import { authUserSchema, registeredUserSchema } from '../../docs/schemas.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './auth.controller.js';
import { registerSchema } from './auth.schema.js';

export const authRoutes = Router();

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'Đăng ký tài khoản sinh viên',
  description: 'Vai trò luôn là STUDENT, không nhận `role` từ client.',
  request: { body: { content: { 'application/json': { schema: registerSchema } } } },
  responses: {
    201: okResponse('Đăng ký thành công', okSchema(registeredUserSchema)),
    ...errorResponses(400, 409),
  },
});
authRoutes.post('/register', validate(registerSchema), ctrl.register);

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Thông tin người dùng hiện tại',
  description: 'Có `role` và `buildingId` đọc từ database — frontend dùng endpoint này thay cho /auth/session.',
  security: [{ cookieAuth: [] }],
  responses: {
    200: okResponse('Người dùng đã đăng nhập', okSchema(authUserSchema)),
    ...errorResponses(401),
  },
});
authRoutes.get('/me', requireAuth, ctrl.me);

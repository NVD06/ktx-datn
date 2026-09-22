import { Router } from 'express';
import {
  errorResponses,
  jsonBody,
  okResponse,
  okSchema,
  pagedSchema,
  registry,
} from '../../config/openapi.js';
import { deletedSchema, registrationPeriodSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamsSchema } from '../../utils/query-schema.js';
import * as ctrl from './registration-period.controller.js';
import {
  createRegistrationPeriodSchema,
  registrationPeriodListQuerySchema,
  updateRegistrationPeriodSchema,
} from './registration-period.schema.js';

export const registrationPeriodRoutes = Router();

// Không chặn vai trò chung cho cả router: /current dành cho sinh viên.
registrationPeriodRoutes.use(requireAuth);
const staff = requireRole('ADMIN', 'MANAGER');
const admin = requireRole('ADMIN');

const security = [{ cookieAuth: [] }];

// Khai báo TRƯỚC '/:id', nếu không Express hiểu "current" là một id.
registry.registerPath({
  method: 'get',
  path: '/registration-periods/current',
  tags: ['Registration periods'],
  summary: 'Đợt đăng ký đang mở (mọi vai trò)',
  description: '`data` là `null` khi không có đợt nào mở.',
  security,
  responses: {
    200: okResponse('Đợt đang mở', okSchema(registrationPeriodSchema.nullable())),
    ...errorResponses(401),
  },
});
registrationPeriodRoutes.get('/current', ctrl.getCurrent);

registry.registerPath({
  method: 'get',
  path: '/registration-periods',
  tags: ['Registration periods'],
  summary: 'Danh sách đợt đăng ký',
  description: 'Sắp xếp: name, startAt, endAt, createdAt. Mặc định startAt giảm dần.',
  security,
  request: { query: registrationPeriodListQuerySchema },
  responses: {
    200: okResponse('Danh sách có phân trang', pagedSchema(registrationPeriodSchema)),
    ...errorResponses(400, 401, 403),
  },
});
registrationPeriodRoutes.get('/', staff, ctrl.list);

registry.registerPath({
  method: 'post',
  path: '/registration-periods',
  tags: ['Registration periods'],
  summary: 'Tạo đợt đăng ký (ADMIN)',
  description: 'Đợt mới luôn ở trạng thái đóng, mở bằng `POST /registration-periods/{id}/open`.',
  security,
  request: { body: jsonBody(createRegistrationPeriodSchema) },
  responses: {
    201: okResponse('Đã tạo', okSchema(registrationPeriodSchema)),
    ...errorResponses(400, 401, 403),
  },
});
registrationPeriodRoutes.post('/', admin, validate(createRegistrationPeriodSchema), ctrl.create);

registry.registerPath({
  method: 'get',
  path: '/registration-periods/{id}',
  tags: ['Registration periods'],
  summary: 'Chi tiết đợt đăng ký',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đợt đăng ký', okSchema(registrationPeriodSchema)),
    ...errorResponses(401, 403, 404),
  },
});
registrationPeriodRoutes.get('/:id', staff, ctrl.getById);

registry.registerPath({
  method: 'patch',
  path: '/registration-periods/{id}',
  tags: ['Registration periods'],
  summary: 'Sửa tên / thời gian đợt đăng ký (ADMIN)',
  security,
  request: { params: idParamsSchema, body: jsonBody(updateRegistrationPeriodSchema) },
  responses: {
    200: okResponse('Đã cập nhật', okSchema(registrationPeriodSchema)),
    ...errorResponses(400, 401, 403, 404),
  },
});
registrationPeriodRoutes.patch('/:id', admin, validate(updateRegistrationPeriodSchema), ctrl.update);

registry.registerPath({
  method: 'post',
  path: '/registration-periods/{id}/open',
  tags: ['Registration periods'],
  summary: 'Mở đợt đăng ký (ADMIN)',
  description:
    'Đang có đợt khác mở -> 409 `PERIOD_ALREADY_OPEN`. Đợt đã qua `endAt` -> 409 `PERIOD_ENDED`. ' +
    'Đợt đã mở sẵn thì trả về nguyên trạng.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã mở', okSchema(registrationPeriodSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
registrationPeriodRoutes.post('/:id/open', admin, ctrl.open);

registry.registerPath({
  method: 'post',
  path: '/registration-periods/{id}/close',
  tags: ['Registration periods'],
  summary: 'Đóng đợt đăng ký (ADMIN)',
  description: 'Đóng bằng tay — hệ thống không tự đóng theo `endAt`.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã đóng', okSchema(registrationPeriodSchema)),
    ...errorResponses(401, 403, 404),
  },
});
registrationPeriodRoutes.post('/:id/close', admin, ctrl.close);

registry.registerPath({
  method: 'delete',
  path: '/registration-periods/{id}',
  tags: ['Registration periods'],
  summary: 'Xóa đợt đăng ký (ADMIN)',
  description: 'Đợt đang mở -> 409 `PERIOD_OPEN`. Đợt đã có đơn -> 409 `PERIOD_HAS_REGISTRATIONS`.',
  security,
  request: { params: idParamsSchema },
  responses: {
    200: okResponse('Đã xóa', okSchema(deletedSchema)),
    ...errorResponses(401, 403, 404, 409),
  },
});
registrationPeriodRoutes.delete('/:id', admin, ctrl.remove);

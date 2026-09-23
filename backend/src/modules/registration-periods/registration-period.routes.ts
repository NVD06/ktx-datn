import { deletedSchema, registrationPeriodSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './registration-period.controller.js';
import {
  createRegistrationPeriodSchema,
  registrationPeriodListQuerySchema,
  updateRegistrationPeriodSchema,
} from './registration-period.schema.js';

// Không chặn vai trò chung cho cả router: /current dành cho sinh viên.
export const registrationPeriodRoutes = defineRoutes(
  '/registration-periods',
  'Registration periods',
  requireAuth,
);
const staff = requireRole('ADMIN', 'MANAGER');
const admin = requireRole('ADMIN');

registrationPeriodRoutes.get(
  '/current',
  {
    summary: 'Đợt đăng ký đang mở (mọi vai trò)',
    description: '`data` là `null` khi không có đợt nào mở.',
    data: registrationPeriodSchema.nullable(),
    errors: [401],
  },
  ctrl.getCurrent,
);

registrationPeriodRoutes.get(
  '/',
  {
    summary: 'Danh sách đợt đăng ký',
    description: 'Sắp xếp: name, startAt, endAt, createdAt. Mặc định startAt giảm dần.',
    query: registrationPeriodListQuerySchema,
    paged: registrationPeriodSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

registrationPeriodRoutes.post(
  '/',
  {
    summary: 'Tạo đợt đăng ký (ADMIN)',
    description: 'Đợt mới luôn ở trạng thái đóng, mở bằng `POST /registration-periods/{id}/open`.',
    body: createRegistrationPeriodSchema,
    status: 201,
    data: registrationPeriodSchema,
    errors: [400, 401, 403],
  },
  admin,
  ctrl.create,
);

registrationPeriodRoutes.patch(
  '/:id',
  {
    summary: 'Sửa tên / thời gian đợt đăng ký (ADMIN)',
    body: updateRegistrationPeriodSchema,
    data: registrationPeriodSchema,
    errors: [400, 401, 403, 404],
  },
  admin,
  ctrl.update,
);

registrationPeriodRoutes.post(
  '/:id/open',
  {
    summary: 'Mở đợt đăng ký (ADMIN)',
    description:
      'Đang có đợt khác mở -> 409 `PERIOD_ALREADY_OPEN`. Đợt đã hết hạn nhận đơn (`endAt`) -> 409 `PERIOD_ENDED`. ' +
      'Đợt đã mở sẵn thì trả về nguyên trạng.',
    data: registrationPeriodSchema,
    errors: [401, 403, 404, 409],
  },
  admin,
  ctrl.open,
);

registrationPeriodRoutes.post(
  '/:id/close',
  {
    summary: 'Đóng đợt đăng ký (ADMIN)',
    description: 'Đóng bằng tay — hệ thống không tự đóng theo `endAt`.',
    data: registrationPeriodSchema,
    errors: [401, 403, 404],
  },
  admin,
  ctrl.close,
);

registrationPeriodRoutes.delete(
  '/:id',
  {
    summary: 'Xóa đợt đăng ký (ADMIN)',
    description: 'Đợt đang mở -> 409 `PERIOD_OPEN`. Đợt đã có đơn -> 409 `PERIOD_HAS_REGISTRATIONS`.',
    data: deletedSchema,
    errors: [401, 403, 404, 409],
  },
  admin,
  ctrl.remove,
);

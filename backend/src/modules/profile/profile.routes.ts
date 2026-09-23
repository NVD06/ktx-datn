import { studentProfileSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './profile.controller.js';
import { updateProfileSchema } from './profile.schema.js';

// Hồ sơ của chính sinh viên đang đăng nhập — không có :id.
export const profileRoutes = defineRoutes('/profile', 'Profile', requireAuth, requireRole('STUDENT'));

profileRoutes.get(
  '/',
  {
    summary: 'Hồ sơ của tôi (STUDENT)',
    description:
      '`isComplete = false` thì chưa nộp được đơn đăng ký; `missingFields` liệt kê trường còn thiếu.',
    data: studentProfileSchema,
    errors: [401, 403, 404],
  },
  ctrl.get,
);

profileRoutes.patch(
  '/',
  {
    summary: 'Cập nhật hồ sơ của tôi (STUDENT)',
    description: 'Không sửa được mã sinh viên và giới tính. Gửi `null` để xóa một trường.',
    body: updateProfileSchema,
    data: studentProfileSchema,
    errors: [400, 401, 403, 404],
  },
  ctrl.update,
);

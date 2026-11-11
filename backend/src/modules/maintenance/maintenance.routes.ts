import { z } from 'zod';
import { maintenanceRequestSchema, maintenanceStatsSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './maintenance.controller.js';
import {
  createMaintenanceSchema,
  maintenanceListQuerySchema,
  maintenanceStatsQuerySchema,
  updateMaintenanceStatusSchema,
} from './maintenance.schema.js';

// Không chặn vai trò chung: sinh viên gửi/xác nhận yêu cầu của mình, ADMIN/MANAGER xem và xử lý
// yêu cầu của phòng trong phạm vi tòa.
export const maintenanceRoutes = defineRoutes('/maintenance-requests', 'Maintenance', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

maintenanceRoutes.get(
  '/',
  {
    summary: 'Danh sách yêu cầu sửa chữa (ADMIN, MANAGER)',
    description:
      'MANAGER chỉ thấy yêu cầu của phòng thuộc tòa mình. `search` tìm theo tiêu đề, mã phòng, tên / email / ' +
      'mã SV. `status=OPEN` lấy yêu cầu chưa sửa xong. Sắp xếp: createdAt, status. Mặc định createdAt giảm dần.',
    query: maintenanceListQuerySchema,
    paged: maintenanceRequestSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

maintenanceRoutes.get(
  '/stats',
  {
    summary: 'Số liệu yêu cầu sửa chữa (ADMIN, MANAGER)',
    description:
      'Đếm theo trạng thái, yêu cầu gửi trong tháng này theo tòa (theo tầng khi chọn `buildingId` hoặc là MANAGER), ' +
      'thời gian trung bình từ lúc gửi tới lúc sửa xong của các yêu cầu xong trong tháng.',
    query: maintenanceStatsQuerySchema,
    data: maintenanceStatsSchema,
    errors: [400, 401, 403, 404],
  },
  staff,
  ctrl.stats,
);

// Khai báo TRƯỚC các route '/:id', nếu không Express hiểu "me" là một id.
maintenanceRoutes.get(
  '/me',
  {
    summary: 'Yêu cầu sửa chữa của tôi (STUDENT)',
    description: 'Mới nhất trước, không phân trang.',
    data: z.array(maintenanceRequestSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

maintenanceRoutes.post(
  '/',
  {
    summary: 'Gửi yêu cầu sửa chữa (STUDENT)',
    description:
      'Chỉ tiêu đề và mô tả, không có ảnh. Phòng lấy từ hợp đồng đang ở của SV (ACTIVE, đã tới ngày vào ở) — ' +
      'SV không tự chọn phòng. Chưa ở phòng nào -> 409 `NO_ACTIVE_CONTRACT`.',
    body: createMaintenanceSchema,
    data: maintenanceRequestSchema,
    status: 201,
    errors: [400, 401, 403, 409],
  },
  student,
  ctrl.create,
);

maintenanceRoutes.patch(
  '/:id/status',
  {
    summary: 'Cập nhật trạng thái yêu cầu (ADMIN, MANAGER)',
    description:
      'Chỉ tiến một bước: PENDING → RECEIVED → DONE, hoặc PENDING → REJECTED (bắt buộc lý do ' +
      'ở `assigneeNote`). Không ở bước liền trước (nhảy cóc, người khác vừa xử lý) -> 409 ' +
      '`INVALID_STATUS_TRANSITION`. Ghi mốc thời gian của bước và người xử lý.',
    body: updateMaintenanceStatusSchema,
    data: maintenanceRequestSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.updateStatus,
);

maintenanceRoutes.post(
  '/:id/confirm',
  {
    summary: 'Xác nhận đã sửa xong (STUDENT)',
    description:
      'Yêu cầu của chính mình đang DONE -> CONFIRMED. Chưa DONE -> 409 `INVALID_STATUS_TRANSITION`. ' +
      'Không tự xác nhận theo thời gian; chưa hài lòng thì gửi yêu cầu mới.',
    data: maintenanceRequestSchema,
    errors: [401, 403, 404, 409],
  },
  student,
  ctrl.confirm,
);

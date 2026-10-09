import { overviewReportSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './report.controller.js';

// Chỉ ADMIN/MANAGER. MANAGER tự động chỉ thấy số liệu tòa mình — service lọc theo scope.
export const reportRoutes = defineRoutes('/reports', 'Reports', requireAuth, requireRole('ADMIN', 'MANAGER'));

reportRoutes.get(
  '/overview',
  {
    summary: 'Số liệu dashboard (ADMIN, MANAGER)',
    description:
      'Giường có người / tổng giường của phòng đang hoạt động, số SV đang ở, hợp đồng sắp hết hạn (30 ngày), ' +
      'hóa đơn chưa thanh toán / quá hạn, yêu cầu sửa chữa theo trạng thái, doanh thu 6 tháng gần nhất ' +
      '(giao dịch VNPay thành công theo tháng thanh toán).',
    data: overviewReportSchema,
    errors: [401, 403],
  },
  ctrl.overview,
);

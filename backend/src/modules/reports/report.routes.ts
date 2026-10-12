import { z } from 'zod';
import {
  buildingDebtSchema,
  debtorSchema,
  occupancyReportSchema,
  overviewReportSchema,
  revenueReportSchema,
} from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './report.controller.js';
import { debtorQuerySchema, occupancyQuerySchema, revenueQuerySchema } from './report.schema.js';

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

reportRoutes.get(
  '/occupancy',
  {
    summary: 'Báo cáo lấp đầy (ADMIN, MANAGER)',
    description:
      'Theo tòa → tầng → phòng, chỉ phòng đang hoạt động (cùng cách tính tỷ lệ lấp đầy của dashboard). ' +
      'Mỗi cấp đếm giường có người / giữ chỗ (hợp đồng chờ ký) / trống / bảo trì; phòng kèm trạng thái. ' +
      'Tòa chưa có phòng đang hoạt động vẫn có mặt (mọi số đếm bằng 0). `buildingId` ngoài phạm vi: ' +
      'MANAGER 403, ADMIN 404.',
    query: occupancyQuerySchema,
    data: occupancyReportSchema,
    errors: [400, 401, 403, 404],
  },
  ctrl.occupancy,
);
reportRoutes.get(
  '/revenue',
  {
    summary: 'Báo cáo doanh thu (ADMIN, MANAGER)',
    description:
      'Từng tháng từ `from` tới `to` (giờ VN, tính cả hai đầu, tối đa 24 tháng) và tổng cả khoảng. Doanh thu là ' +
      'giao dịch VNPay thành công theo tháng thanh toán, tách tiền phòng / điện nước — cùng cách tính với dashboard.',
    query: revenueQuerySchema,
    data: revenueReportSchema,
    errors: [400, 401, 403],
  },
  ctrl.revenue,
);
reportRoutes.get(
  '/debt',
  {
    summary: 'Công nợ theo tòa (ADMIN, MANAGER)',
    description:
      'Mỗi tòa trong phạm vi (MANAGER: tòa mình) kèm số hóa đơn và tổng tiền chưa thanh toán / quá hạn tại lúc ' +
      'xem. Sắp theo tên tòa, tòa không nợ vẫn có mặt với số 0. Tổng các tòa bằng ô "Chưa thanh toán" của dashboard.',
    data: z.array(buildingDebtSchema),
    errors: [401, 403],
  },
  ctrl.debt,
);
reportRoutes.get(
  '/debt/students',
  {
    summary: 'Sinh viên còn nợ (ADMIN, MANAGER)',
    description:
      'Mỗi SV có hóa đơn chưa thanh toán trong phạm vi một dòng: tổng chưa thanh toán, trong đó quá hạn, và ' +
      'phòng của hợp đồng gần nhất. Sắp cố định: quá hạn nhiều tiền nhất trước, rồi tổng chưa thanh toán.',
    query: debtorQuerySchema,
    paged: debtorSchema,
    errors: [400, 401, 403],
  },
  ctrl.debtors,
);

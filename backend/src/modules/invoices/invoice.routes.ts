import { z } from 'zod';
import {
  billUtilitiesResultSchema,
  buildingDebtSchema,
  cancelUtilityResultSchema,
  invoiceDetailSchema,
  invoiceSchema,
  invoiceSummarySchema,
  utilitySheetSchema,
} from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './invoice.controller.js';
import { invoiceListQuerySchema } from './invoice.schema.js';
import { billUtilitiesSchema, cancelUtilitySchema, utilitySheetQuerySchema } from './utility.schema.js';

// Không chặn vai trò chung: sinh viên xem hóa đơn của mình, ADMIN/MANAGER xem theo phạm vi tòa.
export const invoiceRoutes = defineRoutes('/invoices', 'Invoices', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

invoiceRoutes.get(
  '/',
  {
    summary: 'Danh sách hóa đơn (ADMIN, MANAGER)',
    description:
      'MANAGER chỉ thấy hóa đơn có giường thuộc tòa mình. `status=OVERDUE`: chưa thanh toán và đã qua hạn ' +
      '(tính khi đọc, không lưu DB). `search` tìm theo mã hóa đơn, kỳ (`2026-09`), tên / email / mã SV. ' +
      'Sắp xếp: createdAt, dueDate, amount, code. Mặc định createdAt giảm dần.',
    query: invoiceListQuerySchema,
    paged: invoiceSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

// Các đường dẫn cố định khai báo TRƯỚC '/:id', nếu không Express hiểu "summary"/"me" là một id.
invoiceRoutes.get(
  '/summary',
  {
    summary: 'Tổng tiền theo bộ lọc (ADMIN, MANAGER)',
    description: 'Cùng tham số lọc với GET /invoices. Trả số hóa đơn và tổng tiền: tất cả / chưa thanh toán / quá hạn.',
    query: invoiceListQuerySchema,
    data: invoiceSummarySchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.summary,
);

invoiceRoutes.get(
  '/debt-by-building',
  {
    summary: 'Công nợ theo tòa (ADMIN, MANAGER)',
    description:
      'Mỗi tòa trong phạm vi (MANAGER: tòa mình) kèm số hóa đơn và tổng tiền chưa thanh toán / quá hạn. ' +
      'Sắp theo tên tòa, tòa không nợ vẫn có mặt với số 0.',
    data: z.array(buildingDebtSchema),
    errors: [401, 403],
  },
  staff,
  ctrl.debtByBuilding,
);

invoiceRoutes.get(
  '/utility-sheet',
  {
    summary: 'Bảng chốt điện nước của một tòa trong một tháng (ADMIN, MANAGER)',
    description: 'Mỗi phòng kèm số SV chia tiền, đã chốt kỳ này chưa, và chỉ số cũ gợi ý từ lần chốt trước.',
    query: utilitySheetQuerySchema,
    data: utilitySheetSchema,
    errors: [400, 401, 403, 404],
  },
  staff,
  ctrl.utilitySheet,
);

invoiceRoutes.post(
  '/utility',
  {
    summary: 'Chốt chỉ số và lập hóa đơn điện nước (ADMIN, MANAGER)',
    description:
      'Mỗi SV đang ở một hóa đơn UTILITY (2 dòng ELECTRIC + WATER, chia đều). Phòng đã chốt (BILLED), ' +
      'trống (EMPTY) hoặc không dùng gì (NO_USAGE) thì bỏ qua, trả về trong `skipped`.',
    body: billUtilitiesSchema,
    status: 201,
    data: billUtilitiesResultSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.billUtilities,
);

invoiceRoutes.post(
  '/utility/cancel',
  {
    summary: 'Hủy lần chốt điện nước của một phòng (ADMIN, MANAGER)',
    description:
      'Nhập sai chỉ số thì hủy rồi chốt lại. Xóa mọi hóa đơn UTILITY của phòng trong kỳ, trả lại chỉ số đã nhập. ' +
      '409 khi đã có SV thanh toán (UTILITY_PAID), có SV đang ở cổng VNPay (PAYMENT_IN_PROGRESS) hoặc phòng đã ' +
      'chốt tháng sau (LATER_PERIOD_BILLED).',
    body: cancelUtilitySchema,
    data: cancelUtilityResultSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.cancelUtility,
);

invoiceRoutes.get(
  '/me',
  {
    summary: 'Hóa đơn của tôi (STUDENT)',
    description: 'Chưa thanh toán lên đầu (hạn gần nhất trước), rồi đến đã thanh toán. Không phân trang.',
    data: z.array(invoiceSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

invoiceRoutes.post(
  '/:id/pay',
  {
    summary: 'Tạo giao dịch VNPay cho hóa đơn (STUDENT)',
    description:
      'Chỉ hóa đơn của chính SV, còn UNPAID. Số tiền lấy từ DB. Trả `payUrl` để chuyển trình duyệt sang cổng ' +
      'VNPay; kết quả về qua /payments/vnpay-return (trình duyệt) và /payments/vnpay-ipn (server VNPay).',
    status: 201,
    data: z.object({ payUrl: z.url() }),
    errors: [401, 403, 404, 409],
  },
  student,
  ctrl.pay,
);

invoiceRoutes.get(
  '/:id',
  {
    summary: 'Chi tiết hóa đơn',
    description:
      'Các dòng (chỉ số cũ/mới, số lượng, đơn giá, thành tiền) và lịch sử thanh toán. STUDENT chỉ xem hóa đơn ' +
      'của mình (khác -> 404), MANAGER theo tòa (khác -> 403).',
    data: invoiceDetailSchema,
    errors: [401, 403, 404],
  },
  ctrl.getById,
);

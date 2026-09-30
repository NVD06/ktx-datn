import { z } from 'zod';
import { contractSchema, currentStaySchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './contract.controller.js';
import { contractListQuerySchema, contractReasonSchema, extendContractSchema } from './contract.schema.js';

// Không chặn vai trò chung: sinh viên xem/ký/từ chối hợp đồng của mình; ADMIN/MANAGER xem, hủy,
// gia hạn, chấm dứt hợp đồng trong phạm vi tòa.
export const contractRoutes = defineRoutes('/contracts', 'Contracts', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

contractRoutes.get(
  '/',
  {
    summary: 'Danh sách hợp đồng (ADMIN, MANAGER)',
    description:
      'MANAGER chỉ thấy hợp đồng có giường thuộc tòa mình. `status` là trạng thái thực tế (EXPIRED = ' +
      'DRAFT/ACTIVE đã qua ngày kết thúc). `search` tìm theo mã hợp đồng, tên, email, mã SV. ' +
      'Sắp xếp: createdAt, code, endDate. Mặc định createdAt giảm dần.',
    query: contractListQuerySchema,
    paged: contractSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

// Khai báo TRƯỚC '/:id', nếu không Express hiểu "me" là một id.
contractRoutes.get(
  '/me',
  {
    summary: 'Hợp đồng của tôi (STUDENT)',
    description: 'Mọi hợp đồng qua các kỳ, mới nhất trước. Không phân trang.',
    data: z.array(contractSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

contractRoutes.get(
  '/me/current',
  {
    summary: 'Chỗ ở hiện tại của tôi (STUDENT)',
    description:
      'Hợp đồng ACTIVE đã bắt đầu (kể cả quá ngày kết thúc mà chưa trả phòng); chưa có thì hợp đồng ACTIVE ' +
      'sắp bắt đầu gần nhất; không có thì null. Kèm bạn cùng phòng (tên, lớp, giường).',
    data: currentStaySchema,
    errors: [401, 403],
  },
  student,
  ctrl.currentStay,
);

contractRoutes.get(
  '/:id',
  {
    summary: 'Chi tiết hợp đồng',
    description:
      'STUDENT: chỉ hợp đồng của mình (của người khác -> 404). MANAGER: hợp đồng có giường ' +
      'thuộc tòa mình. ADMIN: tất cả.',
    data: contractSchema,
    errors: [401, 403, 404],
  },
  ctrl.getById,
);

contractRoutes.post(
  '/:id/sign',
  {
    summary: 'Ký hợp đồng (STUDENT)',
    description:
      'Một transaction: DRAFT -> ACTIVE, giường -> OCCUPIED. Không lập hóa đơn: tiền phòng tính từ ngày ký, ' +
      'lập vào đầu tháng sau. 409 khi: hợp đồng không còn DRAFT (`CONTRACT_NOT_DRAFT`) · ' +
      'đã quá ngày kết thúc (`CONTRACT_EXPIRED`) · giường đang bảo trì (`BED_UNAVAILABLE`).',
    data: contractSchema,
    errors: [401, 403, 404, 409],
  },
  student,
  ctrl.sign,
);

contractRoutes.post(
  '/:id/decline',
  {
    summary: 'Từ chối ký hợp đồng (STUDENT)',
    description:
      'Chỉ hợp đồng còn chờ ký (DRAFT) của chính mình. Hợp đồng -> CANCELLED kèm lý do, giường trống ' +
      'lại ngay, đơn đăng ký -> CANCELLED (nộp lại được trong đợt). Không còn DRAFT -> 409 `CONTRACT_NOT_DRAFT`.',
    body: contractReasonSchema,
    data: contractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  student,
  ctrl.decline,
);

contractRoutes.post(
  '/:id/cancel',
  {
    summary: 'Hủy hợp đồng chờ ký (ADMIN, MANAGER)',
    description:
      'Hợp đồng còn chờ ký (kể cả đã quá ngày kết thúc mà chưa ký) trong phạm vi tòa. Hợp đồng -> ' +
      'CANCELLED kèm lý do, giường trống lại, đơn -> CANCELLED và lý do ghi vào phản hồi của đơn. ' +
      'Hợp đồng đã ký không hủy được (-> 409 `CONTRACT_NOT_DRAFT`), phải chấm dứt.',
    body: contractReasonSchema,
    data: contractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.cancel,
);

contractRoutes.post(
  '/:id/extend',
  {
    summary: 'Gia hạn hợp đồng đang ở (ADMIN, MANAGER)',
    description:
      'Hợp đồng ACTIVE (kể cả đã quá ngày kết thúc mà SV vẫn ở). `endDate` mới tính hết ngày (23:59 giờ VN), ' +
      'phải sau ngày kết thúc hiện tại và không trước hôm nay (400). Giường giữ nguyên. Không lập hóa đơn riêng: ' +
      'những tháng ở thêm được lập hằng tháng. 409 khi: không còn ACTIVE (`CONTRACT_NOT_ACTIVE`) · phần ở ' +
      'thêm đè lên hợp đồng kỳ sau của SV (`CONTRACT_OVERLAP`).',
    body: extendContractSchema,
    data: contractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.extend,
);

contractRoutes.post(
  '/:id/terminate',
  {
    summary: 'Chấm dứt hợp đồng đang ở / trả phòng (ADMIN, MANAGER)',
    description:
      'Hợp đồng ACTIVE (kể cả đã quá ngày kết thúc — trả phòng). -> TERMINATED kèm lý do, giường trống lại. ' +
      'Hóa đơn chưa thanh toán giữ nguyên (không chặn), không hoàn tiền tự động. Không còn ACTIVE -> 409 ' +
      '`CONTRACT_NOT_ACTIVE` (hợp đồng chờ ký thì dùng /cancel).',
    body: contractReasonSchema,
    data: contractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.terminate,
);

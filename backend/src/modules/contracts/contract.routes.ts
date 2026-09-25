import { z } from 'zod';
import { contractSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './contract.controller.js';
import { cancelContractSchema, contractListQuerySchema } from './contract.schema.js';

// Không chặn vai trò chung: sinh viên xem/ký/từ chối hợp đồng của mình, ADMIN/MANAGER xem và hủy theo phạm vi.
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
      'Một transaction: DRAFT -> ACTIVE, giường -> OCCUPIED, sinh hóa đơn tiền phòng `INV-YYYY-XXXX` ' +
      '(kỳ = mã học kỳ của đợt, hạn 14 ngày). 409 khi: hợp đồng không còn DRAFT (`CONTRACT_NOT_DRAFT`) · ' +
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
    body: cancelContractSchema,
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
    body: cancelContractSchema,
    data: contractSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.cancel,
);

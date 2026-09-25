import { z } from 'zod';
import { contractSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './contract.controller.js';

// Không chặn vai trò chung: sinh viên xem/ký hợp đồng của mình, ADMIN/MANAGER xem theo phạm vi.
export const contractRoutes = defineRoutes('/contracts', 'Contracts', requireAuth);
const student = requireRole('STUDENT');

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

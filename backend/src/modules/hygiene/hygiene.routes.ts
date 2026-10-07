import { z } from 'zod';
import { deletedSchema, hygieneRecordSchema, hygieneSheetSchema, saveHygieneResultSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './hygiene.controller.js';
import { hygieneListQuerySchema, hygieneSheetQuerySchema, saveHygieneSchema } from './hygiene.schema.js';

// Không chặn vai trò chung: sinh viên xem điểm phòng mình, ADMIN/MANAGER chấm và xem điểm
// phòng trong phạm vi tòa.
export const hygieneRoutes = defineRoutes('/hygiene-records', 'Hygiene', requireAuth);
const student = requireRole('STUDENT');
const staff = requireRole('ADMIN', 'MANAGER');

hygieneRoutes.get(
  '/',
  {
    summary: 'Bảng điểm vệ sinh (ADMIN, MANAGER)',
    description:
      'MANAGER chỉ thấy phòng thuộc tòa mình. Lọc theo tháng (`month=2026-10`), `belowWarning=true` chỉ ' +
      'các lần chấm dưới 60 điểm; `search` theo mã phòng, tên tòa. Sắp xếp: checkDate, score, createdAt. ' +
      'Mặc định checkDate giảm dần.',
    query: hygieneListQuerySchema,
    paged: hygieneRecordSchema,
    errors: [400, 401, 403],
  },
  staff,
  ctrl.list,
);

hygieneRoutes.get(
  '/me',
  {
    summary: 'Điểm vệ sinh phòng của tôi (STUDENT)',
    description: 'Điểm của các phòng SV đã ở, chỉ trong thời gian ở đó. Mới nhất trước, không phân trang.',
    data: z.array(hygieneRecordSchema),
    errors: [401, 403],
  },
  student,
  ctrl.listMine,
);

hygieneRoutes.get(
  '/sheet',
  {
    summary: 'Bảng chấm điểm của một tòa trong một ngày (ADMIN, MANAGER)',
    description: 'Phòng đang hoạt động kèm số SV ở ngày đó và điểm đã chấm ngày đó (nếu có) để chấm lại.',
    query: hygieneSheetQuerySchema,
    data: hygieneSheetSchema,
    errors: [400, 401, 403, 404],
  },
  staff,
  ctrl.sheet,
);

hygieneRoutes.post(
  '/',
  {
    summary: 'Lưu điểm một đợt kiểm tra (ADMIN, MANAGER)',
    description:
      'Một tòa, một ngày, nhiều phòng — một transaction. Điểm 0–100; phòng đã có điểm ngày đó thì ghi đè ' +
      '(chấm lại). Phòng không thuộc tòa -> 400. Ngày sau hôm nay -> 400.',
    body: saveHygieneSchema,
    data: saveHygieneResultSchema,
    errors: [400, 401, 403, 404, 409],
  },
  staff,
  ctrl.save,
);

hygieneRoutes.delete(
  '/:id',
  {
    summary: 'Xóa điểm chấm nhầm phòng (ADMIN, MANAGER)',
    description: 'Chấm sai số điểm thì chấm lại để ghi đè, không cần xóa.',
    data: deletedSchema,
    errors: [401, 403, 404],
  },
  staff,
  ctrl.remove,
);

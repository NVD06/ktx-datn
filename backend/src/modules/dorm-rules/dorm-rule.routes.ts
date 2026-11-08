import { z } from 'zod';
import { deletedSchema, dormRuleSchema } from '../../docs/schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { defineRoutes } from '../../utils/define-routes.js';
import * as ctrl from './dorm-rule.controller.js';
import { dormRuleInputSchema } from './dorm-rule.schema.js';

export const dormRuleRoutes = defineRoutes('/dorm-rules', 'DormRules', requireAuth);
const admin = requireRole('ADMIN');

dormRuleRoutes.get(
  '/',
  {
    summary: 'Nội quy KTX (mọi vai trò)',
    description: 'Xếp theo `sortOrder` tăng dần. `content` mỗi dòng là một ý.',
    data: z.array(dormRuleSchema),
    errors: [401],
  },
  ctrl.list,
);

dormRuleRoutes.post(
  '/',
  {
    summary: 'Thêm mục nội quy (ADMIN)',
    body: dormRuleInputSchema,
    data: dormRuleSchema,
    status: 201,
    errors: [400, 401, 403],
  },
  admin,
  ctrl.create,
);

dormRuleRoutes.patch(
  '/:id',
  {
    summary: 'Sửa mục nội quy (ADMIN)',
    body: dormRuleInputSchema,
    data: dormRuleSchema,
    errors: [400, 401, 403, 404],
  },
  admin,
  ctrl.update,
);

dormRuleRoutes.delete(
  '/:id',
  {
    summary: 'Xóa mục nội quy (ADMIN)',
    data: deletedSchema,
    errors: [401, 403, 404],
  },
  admin,
  ctrl.remove,
);

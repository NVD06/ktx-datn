import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';

export const updateUserSchema = z
  .object({
    buildingId: z
      .uuid('Tòa nhà không hợp lệ')
      .nullable()
      .exactOptional()
      .openapi({ description: 'Chỉ áp dụng cho MANAGER. null = gỡ khỏi tòa đang quản lý' }),
  })
  .openapi('UpdateUserInput');

export const userListQuerySchema = listQuerySchema.extend({
  role: z.enum(['ADMIN', 'MANAGER', 'STUDENT']).optional(),
  buildingId: z.uuid().optional(),
  isActive: booleanQuery.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

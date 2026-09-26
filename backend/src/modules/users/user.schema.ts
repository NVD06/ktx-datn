import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from '../../utils/zod-fields.js';

const buildingId = z
  .uuid('Tòa nhà không hợp lệ')
  .nullable()
  .openapi({ description: 'Tòa quản lý — đang hoạt động và chưa có quản lý. null = chưa gán tòa' });

/** Admin tạo tài khoản quản lý. Không có `role`: luôn là MANAGER, không nhận từ client. */
export const createManagerSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    phone: phoneSchema.exactOptional(),
    password: passwordSchema.openapi({ description: 'Mật khẩu ban đầu — Admin báo cho người quản lý' }),
    buildingId: buildingId.exactOptional(),
  })
  .openapi('CreateManagerInput');

export const updateUserSchema = z
  .object({
    buildingId: buildingId.exactOptional().openapi({ description: 'Chỉ áp dụng cho MANAGER. null = gỡ khỏi tòa' }),
    isActive: z
      .boolean('Trạng thái không hợp lệ')
      .exactOptional()
      .openapi({ description: 'false = khóa: request kế tiếp của người đó bị 401. Không tự khóa chính mình' }),
  })
  .openapi('UpdateUserInput');

export const userListQuerySchema = listQuerySchema.extend({
  role: z.enum(['ADMIN', 'MANAGER', 'STUDENT']).optional(),
  buildingId: z.uuid().optional(),
  isActive: booleanQuery.optional(),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

import { z } from 'zod';
import '../config/openapi.js';

/**
 * Zod schema mô tả dữ liệu TRẢ VỀ, chỉ dùng cho tài liệu API.
 * Schema validate đầu vào vẫn nằm ở từng module (*.schema.ts).
 */

export const roleSchema = z.enum(['ADMIN', 'MANAGER', 'STUDENT']).openapi('Role');
export const genderSchema = z.enum(['MALE', 'FEMALE']).openapi('Gender');

export const authUserSchema = z
  .object({
    id: z.uuid(),
    fullName: z.string().openapi({ example: 'Nguyễn Văn A' }),
    email: z.email().openapi({ example: 'sv001@example.com' }),
    role: roleSchema,
    buildingId: z.uuid().nullable().openapi({ description: 'Chỉ MANAGER mới có giá trị' }),
  })
  .openapi('AuthUser');

export const registeredUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    fullName: z.string(),
    role: roleSchema,
  })
  .openapi('RegisteredUser');

export const buildingSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Tòa A' }),
    floors: z.int().openapi({ example: 5 }),
    gender: genderSchema.nullable().openapi({ description: 'null = tòa hỗn hợp' }),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Building');

/** Query phân trang dùng chung — khớp utils/paginate.ts. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.string().optional().openapi({ example: 'createdAt' }),
  order: z.enum(['asc', 'desc']).optional(),
});

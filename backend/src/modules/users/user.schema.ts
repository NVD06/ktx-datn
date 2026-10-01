import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { emailSchema, fullNameSchema, optionalText, passwordSchema, phoneSchema } from '../../utils/zod-fields.js';

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

/** Mã SV — định danh của trường, cũng là mật khẩu ban đầu của tài khoản. */
const studentCode = z
  .string('Vui lòng nhập mã sinh viên')
  .trim()
  .min(3, 'Mã sinh viên quá ngắn')
  .max(20, 'Mã sinh viên tối đa 20 ký tự')
  .openapi({ example: '21010001' });

/**
 * Admin cấp tài khoản sinh viên — một người, hoặc từng dòng của file Excel. Không có
 * mật khẩu: mật khẩu ban đầu luôn là mã SV, sinh viên phải đổi ở lần đăng nhập đầu.
 * Giữ khớp với frontend/src/features/users/student-account.ts.
 */
export const studentAccountSchema = z
  .object({
    studentCode,
    fullName: fullNameSchema,
    email: emailSchema,
    gender: z.enum(['MALE', 'FEMALE'], 'Giới tính phải là Nam hoặc Nữ'),
    phone: phoneSchema.exactOptional(),
    className: optionalText('Lớp', 50).exactOptional().openapi({ example: 'CNTT1' }),
    faculty: optionalText('Khoa', 100).exactOptional().openapi({ example: 'Công nghệ thông tin' }),
  })
  .openapi('StudentAccountInput');

export const importStudentsSchema = z
  .object({
    rows: z
      .array(studentAccountSchema)
      .min(1, 'File không có dòng sinh viên nào')
      .max(1000, 'Mỗi lần nhập tối đa 1000 sinh viên'),
    dryRun: z.boolean().exactOptional().openapi({ description: 'true = chỉ kiểm tra, không tạo tài khoản nào' }),
  })
  .openapi('ImportStudentsInput');

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
export type StudentAccountInput = z.infer<typeof studentAccountSchema>;
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

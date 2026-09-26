import '../../config/openapi.js';
import { z } from 'zod';
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from '../../utils/zod-fields.js';

/**
 * Chuẩn hóa TRƯỚC, kiểm tra SAU.
 *
 * Zod chạy đúng thứ tự khai báo, nên `.trim()` đặt cuối chuỗi là vô nghĩa:
 *   - `z.email().trim()`        kiểm tra định dạng trên chuỗi còn nguyên dấu
 *     cách -> "sv001@example.com " bị 400, đúng tình huống `.trim()` sinh ra để
 *     xử lý.
 *   - `z.string().min(2).trim()` đếm cả dấu cách -> "      " lọt qua min(2) rồi
 *     bị cắt thành chuỗi rỗng, lưu thẳng vào database.
 *
 * `z.email()` là schema định dạng chứ không phải `z.string()`, nên phải nối
 * bằng `.pipe()` mới đặt được `.trim()` lên trước.
 */

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
    phone: phoneSchema.optional(),
    studentCode: z.string().trim().min(3, 'Mã sinh viên quá ngắn').max(20).openapi({ example: 'SV001' }),
    gender: z.enum(['MALE', 'FEMALE']),
    className: z.string().trim().max(50).optional().openapi({ example: 'CNTT1' }),
    faculty: z.string().trim().max(100).optional().openapi({ example: 'Công nghệ thông tin' }),
  })
  .openapi('RegisterInput');

export type RegisterInput = z.infer<typeof registerSchema>;

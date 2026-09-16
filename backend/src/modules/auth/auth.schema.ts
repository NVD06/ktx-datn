import '../../config/openapi.js';
import { z } from 'zod';

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
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Email không hợp lệ'))
  .openapi({ type: 'string', format: 'email', example: 'sv001@example.com' });

export const registerSchema = z
  .object({
    email,
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(72).openapi({ example: 'matkhau123' }),
    fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(100).openapi({ example: 'Nguyễn Văn A' }),
    phone: z
      .string()
      .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
      .optional()
      .openapi({ example: '0912345678' }),
    studentCode: z.string().trim().min(3, 'Mã sinh viên quá ngắn').max(20).openapi({ example: 'SV001' }),
    gender: z.enum(['MALE', 'FEMALE']),
    className: z.string().trim().max(50).optional().openapi({ example: 'CNTT1' }),
    faculty: z.string().trim().max(100).optional().openapi({ example: 'Công nghệ thông tin' }),
  })
  .openapi('RegisterInput');

export type RegisterInput = z.infer<typeof registerSchema>;

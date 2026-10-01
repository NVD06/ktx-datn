import '../../config/openapi.js';
import { z } from 'zod';
import { passwordSchema } from '../../utils/zod-fields.js';

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

/**
 * Không có đăng ký: tài khoản sinh viên do Admin cấp (users/user.schema.ts), mật khẩu
 * ban đầu là mã SV và phải đổi ở lần đăng nhập đầu — qua schema này.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string('Vui lòng nhập mật khẩu hiện tại').min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: passwordSchema,
  })
  .openapi('ChangePasswordInput');

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

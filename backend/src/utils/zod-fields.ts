import '../config/openapi.js';
import { z } from 'zod';

/** Trường zod dùng chung cho body của nhiều module. */

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
  .openapi({ example: '0912345678' });

/**
 * Email: chuẩn hóa (cắt khoảng trắng, chữ thường) TRƯỚC rồi mới kiểm tra định dạng —
 * `z.email()` là schema định dạng nên phải nối bằng `.pipe()`. Xem auth.schema.ts.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Email không hợp lệ'))
  .openapi({ type: 'string', format: 'email', example: 'sv001@example.com' });

/** Tối đa 72 ký tự: bcrypt bỏ qua phần sau byte thứ 72. */
export const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .openapi({ example: 'matkhau123' });

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Họ tên quá ngắn')
  .max(100, 'Họ tên tối đa 100 ký tự')
  .openapi({ example: 'Nguyễn Văn A' });

/** Chữ tự do không bắt buộc: cắt khoảng trắng, chuỗi rỗng lưu thành `null`. */
export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`).transform((v) => v || null).nullable();

/** Chữ tự do bắt buộc: "Vui lòng nhập lý do", "Lý do tối đa 500 ký tự". */
export const requiredText = (label: string, max: number) => {
  const required = `Vui lòng nhập ${label.toLowerCase()}`;
  return z.string(required).trim().min(1, required).max(max, `${label} tối đa ${max} ký tự`);
};

/**
 * Ngày gửi lên dạng chuỗi — nhận cả "2026-09-01" (từ <input type="date">) lẫn ISO đầy đủ.
 * Bắt buộc là chuỗi: `z.coerce.date()` đứng một mình biến `null`/`0`/`true` thành 01/01/1970.
 */
export const dateField = (label: string) =>
  z.string(`${label} không hợp lệ`).pipe(z.coerce.date(`${label} không hợp lệ`));

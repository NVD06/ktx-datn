import '../config/openapi.js';
import { z } from 'zod';

/** Trường zod dùng chung cho body của nhiều module. */

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
  .openapi({ example: '0912345678' });

/** Chữ tự do không bắt buộc: cắt khoảng trắng, chuỗi rỗng lưu thành `null`. */
export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`).transform((v) => v || null).nullable();

/** Chữ tự do bắt buộc: "Vui lòng nhập lý do", "Lý do tối đa 500 ký tự". */
export const requiredText = (label: string, max: number) => {
  const required = `Vui lòng nhập ${label.toLowerCase()}`;
  return z.string(required).trim().min(1, required).max(max, `${label} tối đa ${max} ký tự`);
};

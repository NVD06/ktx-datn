import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';

const name = z
  .string()
  .trim()
  .min(1, 'Tên đợt đăng ký không được để trống')
  .max(100, 'Tên đợt đăng ký tối đa 100 ký tự');
// Nhận cả "2026-09-01" lẫn ISO đầy đủ — FE gửi từ <input type="date">.
const date = (label: string) => z.coerce.date(`${label} không hợp lệ`);

const endAfterStart = (v: { startAt?: Date; endAt?: Date }) =>
  !v.startAt || !v.endAt || v.endAt > v.startAt;
const endAfterStartIssue = { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['endAt'] };

// Không nhận `isOpen`: mở/đóng đi qua POST /:id/open và /:id/close để service
// kiểm tra "chỉ 1 đợt mở" tại đúng một chỗ.
export const createRegistrationPeriodSchema = z
  .object({
    name: name.openapi({ example: 'Đăng ký học kỳ 1 năm 2026-2027' }),
    startAt: date('Ngày bắt đầu').openapi({ example: '2026-08-01T00:00:00.000Z' }),
    endAt: date('Ngày kết thúc').openapi({ example: '2026-08-31T00:00:00.000Z' }),
  })
  .refine(endAfterStart, endAfterStartIssue)
  .openapi('CreateRegistrationPeriodInput');

export const updateRegistrationPeriodSchema = z
  .object({
    name: name.exactOptional(),
    startAt: date('Ngày bắt đầu').exactOptional(),
    endAt: date('Ngày kết thúc').exactOptional(),
  })
  .refine(endAfterStart, endAfterStartIssue)
  .openapi('UpdateRegistrationPeriodInput');

export const registrationPeriodListQuerySchema = listQuerySchema.extend({
  isOpen: booleanQuery.optional(),
});

export type CreateRegistrationPeriodInput = z.infer<typeof createRegistrationPeriodSchema>;
export type UpdateRegistrationPeriodInput = z.infer<typeof updateRegistrationPeriodSchema>;
export type RegistrationPeriodListQuery = z.infer<typeof registrationPeriodListQuerySchema>;

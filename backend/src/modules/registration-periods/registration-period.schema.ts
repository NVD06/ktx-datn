import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { dateField } from '../../utils/zod-fields.js';

const name = z
  .string()
  .trim()
  .min(1, 'Tên đợt đăng ký không được để trống')
  .max(100, 'Tên đợt đăng ký tối đa 100 ký tự');
// Năm bắt đầu năm học + học kỳ: HK2 của năm học 2026-2027 là "2026-HK2", HE = học kỳ hè.
// Thành Invoice.period của hóa đơn tiền phòng nên phải đúng một dạng duy nhất.
const term = z
  .string('Mã học kỳ không hợp lệ')
  .trim()
  .toUpperCase()
  .regex(/^\d{4}-(HK1|HK2|HE)$/, 'Mã học kỳ có dạng 2026-HK1, 2026-HK2 hoặc 2026-HE (học kỳ hè)');

type PeriodDates = { startAt?: Date; endAt?: Date; stayStartAt?: Date; stayEndAt?: Date };

/**
 * Kiểm tra thứ tự các mốc ngày. Dùng chung cho schema (khi gửi đủ ngày) và
 * service (khi PATCH một phần, ghép với ngày đang lưu).
 */
export function periodDateIssues(v: PeriodDates): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  if (v.startAt && v.endAt && v.endAt <= v.startAt) {
    issues.endAt = ['Ngày hết hạn nhận đơn phải sau ngày bắt đầu nhận đơn'];
  }
  if (v.stayStartAt && v.stayEndAt && v.stayEndAt <= v.stayStartAt) {
    issues.stayEndAt = ['Ngày kết thúc ở phải sau ngày bắt đầu ở'];
  }
  // Ở trước cả khi mở nhận đơn là vô lý; ở trước khi hết hạn nhận đơn thì được
  // (KTX thường cho SV vào ở trong lúc vẫn nhận đơn bổ sung).
  if (v.startAt && v.stayStartAt && v.stayStartAt < v.startAt) {
    issues.stayStartAt = ['Ngày bắt đầu ở không được trước ngày bắt đầu nhận đơn'];
  }
  // Còn nhận đơn sau khi thời gian ở đã kết thúc thì đơn nộp muộn không có gì để ở.
  if (v.endAt && v.stayEndAt && v.endAt > v.stayEndAt && !issues.endAt) {
    issues.endAt = ['Ngày hết hạn nhận đơn không được sau ngày kết thúc ở'];
  }
  return issues;
}

function refineDates(v: PeriodDates, ctx: z.RefinementCtx) {
  for (const [path, messages] of Object.entries(periodDateIssues(v))) {
    for (const message of messages) ctx.addIssue({ code: 'custom', message, path: [path] });
  }
}

// Không nhận `isOpen`: mở/đóng đi qua POST /:id/open và /:id/close để service
// kiểm tra "chỉ 1 đợt mở" tại đúng một chỗ.
export const createRegistrationPeriodSchema = z
  .object({
    name: name.openapi({ example: 'Đăng ký học kỳ 1 năm 2026-2027' }),
    term: term.openapi({
      example: '2026-HK1',
      description: 'Mã học kỳ — kỳ của hóa đơn tiền phòng lập từ hợp đồng của đợt',
    }),
    startAt: dateField('Ngày bắt đầu nhận đơn').openapi({
      example: '2026-08-01T00:00:00.000Z',
      description: 'Thời gian nhận đơn — để thông báo, mở/đóng thật do Admin bấm',
    }),
    endAt: dateField('Ngày hết hạn nhận đơn').openapi({ example: '2026-08-31T00:00:00.000Z' }),
    stayStartAt: dateField('Ngày bắt đầu ở').openapi({
      example: '2026-09-05T00:00:00.000Z',
      description: 'Thời gian ở — kỳ hạn của hợp đồng sinh ra từ đợt này',
    }),
    stayEndAt: dateField('Ngày kết thúc ở').openapi({ example: '2027-01-15T00:00:00.000Z' }),
  })
  .superRefine(refineDates)
  .openapi('CreateRegistrationPeriodInput');

export const updateRegistrationPeriodSchema = z
  .object({
    name: name.exactOptional(),
    term: term.exactOptional(),
    startAt: dateField('Ngày bắt đầu nhận đơn').exactOptional(),
    endAt: dateField('Ngày hết hạn nhận đơn').exactOptional(),
    stayStartAt: dateField('Ngày bắt đầu ở').exactOptional(),
    stayEndAt: dateField('Ngày kết thúc ở').exactOptional(),
  })
  .superRefine(refineDates)
  .openapi('UpdateRegistrationPeriodInput');

export const registrationPeriodListQuerySchema = listQuerySchema.extend({
  isOpen: booleanQuery.optional(),
});

export type CreateRegistrationPeriodInput = z.infer<typeof createRegistrationPeriodSchema>;
export type UpdateRegistrationPeriodInput = z.infer<typeof updateRegistrationPeriodSchema>;
export type RegistrationPeriodListQuery = z.infer<typeof registrationPeriodListQuerySchema>;

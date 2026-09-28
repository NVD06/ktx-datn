import '../../config/openapi.js';
import { z } from 'zod';

/** Kỳ điện nước "2026-09" — cũng là `Invoice.period` của hóa đơn UTILITY. */
const period = z
  .string('Tháng không hợp lệ')
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (dạng 2026-09)')
  .openapi({ example: '2026-09' });

const meterIndex = z.int('Chỉ số phải là số nguyên').min(0, 'Chỉ số không được âm').max(99_999_999, 'Chỉ số quá lớn');

export const utilitySheetQuerySchema = z.object({ buildingId: z.uuid('Tòa nhà không hợp lệ'), period });

export const billUtilitiesSchema = z
  .object({
    buildingId: z.uuid('Tòa nhà không hợp lệ'),
    period,
    readings: z
      .array(
        z
          .object({
            roomId: z.uuid('Phòng không hợp lệ'),
            electricOld: meterIndex,
            electricNew: meterIndex,
            waterOld: meterIndex,
            waterNew: meterIndex,
          })
          .refine((r) => r.electricNew >= r.electricOld, { path: ['electricNew'], message: 'Điện mới nhỏ hơn điện cũ' })
          .refine((r) => r.waterNew >= r.waterOld, { path: ['waterNew'], message: 'Nước mới nhỏ hơn nước cũ' }),
      )
      .min(1, 'Chưa nhập chỉ số phòng nào')
      .max(500)
      .refine((rows) => new Set(rows.map((r) => r.roomId)).size === rows.length, 'Mỗi phòng chỉ nhập một lần'),
  })
  .openapi('BillUtilitiesInput');

export type UtilitySheetQuery = z.infer<typeof utilitySheetQuerySchema>;
export type BillUtilitiesInput = z.infer<typeof billUtilitiesSchema>;

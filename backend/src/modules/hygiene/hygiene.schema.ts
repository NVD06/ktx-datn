import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { dateField, optionalText } from '../../utils/zod-fields.js';

const checkDate = dateField('Ngày kiểm tra').openapi({
  example: '2026-10-07',
  description: 'Tính theo ngày ở Việt Nam, không được sau hôm nay',
});

const score = (label: string) =>
  z.int(`${label} phải là số nguyên`).min(0, `${label} từ 0 đến 100`).max(100, `${label} từ 0 đến 100`);

export const hygieneSheetQuerySchema = z.object({ buildingId: z.uuid('Tòa nhà không hợp lệ'), checkDate });

/**
 * Chấm một đợt kiểm tra: một tòa, một ngày, nhiều phòng. Phòng đã có điểm ngày đó thì
 * ghi đè (chấm lại khi nhập sai).
 */
export const saveHygieneSchema = z
  .object({
    buildingId: z.uuid('Tòa nhà không hợp lệ'),
    checkDate,
    records: z
      .array(
        z.object({
          roomId: z.uuid('Phòng không hợp lệ'),
          score: score('Điểm').openapi({ example: 85, description: 'Điểm cuối cùng — dưới 60 là cảnh báo' }),
          deduction: score('Điểm trừ')
            .default(0)
            .openapi({ example: 5, description: 'Điểm bị trừ vì vi phạm nội quy, lý do ghi ở `note`' }),
          note: optionalText('Ghi chú', 500).exactOptional().openapi({ example: 'Để rác qua đêm' }),
        }),
      )
      .min(1, 'Chưa nhập điểm phòng nào')
      .max(500)
      .refine((rows) => new Set(rows.map((r) => r.roomId)).size === rows.length, 'Mỗi phòng chỉ chấm một lần'),
  })
  .openapi('SaveHygieneInput');

export const hygieneListQuerySchema = listQuerySchema.extend({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (dạng 2026-10)')
    .optional()
    .openapi({ example: '2026-10' }),
  belowWarning: booleanQuery.optional().openapi({ description: 'true: chỉ các lần chấm dưới 60 điểm' }),
});

export type HygieneSheetQuery = z.infer<typeof hygieneSheetQuerySchema>;
export type SaveHygieneInput = z.infer<typeof saveHygieneSchema>;
export type HygieneListQuery = z.infer<typeof hygieneListQuerySchema>;

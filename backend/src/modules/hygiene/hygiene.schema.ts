import '../../config/openapi.js';
import { z } from 'zod';
import { HygieneViolation } from '../../generated/prisma/enums.js';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { dateField } from '../../utils/zod-fields.js';

const checkDate = dateField('Ngày kiểm tra').openapi({
  example: '2026-10-07',
  description: 'Tính theo ngày ở Việt Nam, không được sau hôm nay',
});

export const hygieneSheetQuerySchema = z.object({ buildingId: z.uuid('Tòa nhà không hợp lệ'), checkDate });

/**
 * Chấm một đợt kiểm tra: một tòa, một ngày, nhiều phòng, mỗi phòng một danh sách lỗi. Phòng
 * đã có điểm ngày đó thì ghi đè (chấm lại khi nhập sai).
 */
export const saveHygieneSchema = z
  .object({
    buildingId: z.uuid('Tòa nhà không hợp lệ'),
    checkDate,
    records: z
      .array(
        z.object({
          roomId: z.uuid('Phòng không hợp lệ'),
          violations: z
            .array(z.enum(HygieneViolation, 'Lỗi vệ sinh không hợp lệ'))
            .refine((v) => new Set(v).size === v.length, 'Mỗi lỗi chỉ tính một lần')
            .openapi({
              example: ['TRASH', 'CORRIDOR'],
              description: 'Lỗi phát hiện trong đợt — điểm trừ là tổng điểm các lỗi, trừ dồn vào điểm của tháng',
            }),
        }),
      )
      .min(1, 'Chưa chấm phòng nào')
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

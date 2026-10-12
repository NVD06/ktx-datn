import '../../config/openapi.js';
import { z } from 'zod';
import { monthCount } from '../../utils/date-vn.js';
import { listQuerySchema } from '../../utils/query-schema.js';

export const occupancyQuerySchema = z.object({
  buildingId: z
    .uuid('Tòa nhà không hợp lệ')
    .optional()
    .openapi({ description: 'Chỉ một tòa. Bỏ trống: mọi tòa trong phạm vi (MANAGER chỉ có tòa mình)' }),
});

export type OccupancyQuery = z.infer<typeof occupancyQuerySchema>;
const REPORT_MAX_MONTHS = 24;
const month = z.string('Tháng không hợp lệ').regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (dạng 2026-09)');
export const monthRangeQuerySchema = z
  .object({
    from: month.openapi({ example: '2026-05', description: 'Tháng đầu (giờ VN), tính cả tháng này' }),
    to: month.openapi({ example: '2026-10', description: 'Tháng cuối (giờ VN), tính cả tháng này' }),
  })
  .refine(({ from, to }) => from <= to, { path: ['to'], message: 'Tháng cuối không được trước tháng đầu' })
  .refine(({ from, to }) => monthCount(from, to) <= REPORT_MAX_MONTHS, {
    path: ['from'],
    message: `Chỉ xem được tối đa ${REPORT_MAX_MONTHS} tháng một lần`,
  });
export type MonthRangeQuery = z.infer<typeof monthRangeQuerySchema>;
export const debtorQuerySchema = listQuerySchema.pick({ page: true, limit: true }).extend({
  search: listQuerySchema.shape.search.openapi({ description: 'Tên, email hoặc mã SV' }),
});
export type DebtorQuery = z.infer<typeof debtorQuerySchema>;

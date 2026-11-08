import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';
import { optionalText, requiredText } from '../../utils/zod-fields.js';

export const createMaintenanceSchema = z
  .object({
    title: requiredText('Tiêu đề', 150).openapi({ example: 'Vòi nước nhà vệ sinh bị rỉ' }),
    description: requiredText('Mô tả', 2000).openapi({ example: 'Vòi rỉ nước liên tục từ tối qua, đã khóa van nhưng vẫn chảy.' }),
  })
  .openapi('CreateMaintenanceRequestInput');

export const updateMaintenanceStatusSchema = z
  .object({
    // CONFIRMED do SV tự bấm (/confirm), PENDING là trạng thái lúc gửi.
    status: z.enum(['RECEIVED', 'DONE', 'REJECTED'], 'Trạng thái không hợp lệ').openapi({
      description: 'Chỉ tiến một bước: PENDING → RECEIVED → DONE, hoặc PENDING → REJECTED',
    }),
    assigneeNote: optionalText('Phản hồi', 1000)
      .exactOptional()
      .openapi({ example: 'Hư hỏng do sử dụng sai cách, sinh viên tự sửa', description: 'Bắt buộc khi từ chối (lý do)' }),
  })
  .refine((input) => input.status !== 'REJECTED' || !!input.assigneeNote, {
    path: ['assigneeNote'],
    message: 'Vui lòng nhập lý do từ chối',
  })
  .openapi('UpdateMaintenanceStatusInput');

export const maintenanceListQuerySchema = listQuerySchema.extend({
  status: z
    .enum(['OPEN', 'PENDING', 'RECEIVED', 'DONE', 'CONFIRMED', 'REJECTED'])
    .optional()
    .openapi({ description: 'OPEN = chưa sửa xong (PENDING hoặc RECEIVED)' }),
  buildingId: z.uuid().optional(),
});

export const maintenanceStatsQuerySchema = z.object({ buildingId: z.uuid().optional() });

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;
export type MaintenanceListQuery = z.infer<typeof maintenanceListQuerySchema>;
export type MaintenanceStatsQuery = z.infer<typeof maintenanceStatsQuerySchema>;

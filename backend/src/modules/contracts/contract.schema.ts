import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';
import { requiredText } from '../../utils/zod-fields.js';

/** Lý do hủy — dùng chung cho SV từ chối ký và Manager hủy hợp đồng chờ ký. */
export const cancelContractSchema = z
  .object({ reason: requiredText('Lý do', 500).openapi({ example: 'Em đã tìm được chỗ ở gần trường hơn' }) })
  .openapi('CancelContractInput');

export const contractListQuerySchema = listQuerySchema.extend({
  // Trạng thái THỰC TẾ (EXPIRED tính theo ngày kết thúc), khớp với cột trạng thái trên bảng.
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']).optional(),
  periodId: z.uuid().optional(),
});

export type CancelContractInput = z.infer<typeof cancelContractSchema>;
export type ContractListQuery = z.infer<typeof contractListQuerySchema>;

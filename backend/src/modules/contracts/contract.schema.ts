import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';
import { dateField, requiredText } from '../../utils/zod-fields.js';

/** Lý do bắt buộc — dùng chung cho SV từ chối ký, Manager hủy hợp đồng chờ ký, và chấm dứt hợp đồng. */
export const contractReasonSchema = z
  .object({ reason: requiredText('Lý do', 500).openapi({ example: 'Sinh viên xin chuyển ra ở ngoài' }) })
  .openapi('ContractReasonInput');

export const extendContractSchema = z
  .object({
    endDate: dateField('Ngày kết thúc mới').openapi({
      example: '2027-02-28',
      description: 'Tính hết ngày đó (23:59 giờ VN). Phải sau ngày kết thúc hiện tại và không trước hôm nay',
    }),
  })
  .openapi('ExtendContractInput');

export const contractListQuerySchema = listQuerySchema.extend({
  // Trạng thái THỰC TẾ (EXPIRED tính theo ngày kết thúc), khớp với cột trạng thái trên bảng.
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']).optional(),
  periodId: z.uuid().optional(),
  extension: z.enum(['PENDING']).optional().openapi({ description: 'PENDING: chỉ hợp đồng có yêu cầu gia hạn chờ duyệt' }),
});

export type ContractReasonInput = z.infer<typeof contractReasonSchema>;
export type ExtendContractInput = z.infer<typeof extendContractSchema>;
export type ContractListQuery = z.infer<typeof contractListQuerySchema>;

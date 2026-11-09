import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';

export const invoiceListQuerySchema = listQuerySchema.extend({
  status: z.enum(['UNPAID', 'OVERDUE', 'PAID']).optional().openapi({
    description: 'UNPAID: mọi hóa đơn chưa thanh toán (gồm cả quá hạn) · OVERDUE: chưa thanh toán và đã qua hạn · PAID',
  }),
  type: z.enum(['ROOM_FEE', 'UTILITY']).optional(),
});

export const remindInvoicesSchema = z
  .object({
    invoiceIds: z
      .array(z.uuid('Hóa đơn không hợp lệ'))
      .min(1)
      .max(500)
      .optional()
      .openapi({ description: 'Bỏ trống: nhắc mọi hóa đơn chưa thanh toán trong phạm vi' }),
  })
  .openapi('RemindInvoicesInput');

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type RemindInvoicesInput = z.infer<typeof remindInvoicesSchema>;

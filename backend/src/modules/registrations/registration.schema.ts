import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';
import { optionalText } from '../../utils/zod-fields.js';

export const createRegistrationSchema = z
  .object({
    buildingId: z
      .uuid('Tòa nhà không hợp lệ')
      .nullable()
      .exactOptional()
      .openapi({ description: 'Nguyện vọng tòa. Bỏ trống = tòa nào cũng được' }),
    preferredRoomTypeId: z
      .uuid('Loại phòng không hợp lệ')
      .nullable()
      .exactOptional()
      .openapi({ description: 'Nguyện vọng loại phòng, phải đang sử dụng. Bỏ trống = loại nào cũng được' }),
    note: optionalText('Ghi chú', 500).exactOptional().openapi({ example: 'Em muốn ở tầng thấp' }),
  })
  .openapi('CreateRegistrationInput');

export const registrationListQuerySchema = listQuerySchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  periodId: z.uuid().optional(),
});

export const approveRegistrationSchema = z
  .object({
    bedId: z
      .uuid('Vui lòng chọn giường')
      .openapi({ description: 'Giường xếp cho sinh viên — chọn từ GET /beds/available' }),
  })
  .openapi('ApproveRegistrationInput');

export const rejectRegistrationSchema = z
  .object({
    reviewNote: z
      .string('Vui lòng nhập lý do từ chối')
      .trim()
      .min(1, 'Vui lòng nhập lý do từ chối')
      .max(500, 'Lý do từ chối tối đa 500 ký tự')
      .openapi({ example: 'Hồ sơ không thuộc diện ưu tiên của đợt này' }),
  })
  .openapi('RejectRegistrationInput');

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type ApproveRegistrationInput = z.infer<typeof approveRegistrationSchema>;
export type RejectRegistrationInput = z.infer<typeof rejectRegistrationSchema>;
export type RegistrationListQuery = z.infer<typeof registrationListQuerySchema>;

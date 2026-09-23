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

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type RegistrationListQuery = z.infer<typeof registrationListQuerySchema>;

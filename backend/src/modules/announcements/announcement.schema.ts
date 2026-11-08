import '../../config/openapi.js';
import { z } from 'zod';
import { listQuerySchema } from '../../utils/query-schema.js';
import { requiredText } from '../../utils/zod-fields.js';

export const announcementInputSchema = z
  .object({
    title: requiredText('Tiêu đề', 150).openapi({ example: 'Tạm ngừng cấp nước tòa B1 sáng thứ Bảy' }),
    content: requiredText('Nội dung', 5000).openapi({ example: 'Từ 8h đến 11h ngày 14/11 để vệ sinh bồn chứa.' }),
    buildingId: z
      .uuid('Tòa nhà không hợp lệ')
      .nullable()
      .default(null)
      .openapi({ description: 'null: toàn KTX. MANAGER luôn đăng cho tòa mình, giá trị này bị bỏ qua' }),
    pinned: z.boolean('Ghim không hợp lệ').default(false),
  })
  .openapi('AnnouncementInput');

export const announcementListQuerySchema = listQuerySchema;

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>;

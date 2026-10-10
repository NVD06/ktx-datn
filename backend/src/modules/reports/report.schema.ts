import '../../config/openapi.js';
import { z } from 'zod';

export const occupancyQuerySchema = z.object({
  buildingId: z
    .uuid('Tòa nhà không hợp lệ')
    .optional()
    .openapi({ description: 'Chỉ một tòa. Bỏ trống: mọi tòa trong phạm vi (MANAGER chỉ có tòa mình)' }),
});

export type OccupancyQuery = z.infer<typeof occupancyQuerySchema>;

import '../config/openapi.js';
import { z } from 'zod';

/**
 * Schema cho query string và params của URL.
 *
 * Query luôn là chuỗi nên phải tự ép kiểu. Riêng boolean KHÔNG dùng
 * `z.coerce.boolean()` — nó biến chuỗi "false" thành `true`.
 */
export const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Query phân trang dùng chung — khớp utils/paginate.ts. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.string().optional().openapi({ example: 'createdAt' }),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().max(100).optional(),
});

/** `:id` trên URL — chỉ dùng cho tài liệu API. */
export const idParamsSchema = z.object({ id: z.uuid() });

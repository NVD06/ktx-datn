import type { PaginationMeta } from '../types/response.js';

export type SortOrder = 'asc' | 'desc';

/**
 * Query đã qua `listQuerySchema` (query-schema.ts): zod đã ép kiểu, đặt mặc định
 * và chặn giới hạn cho page/limit/order — ở đây chỉ còn phải kiểm tra `sortBy`.
 */
interface ListQuery {
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  order?: SortOrder | undefined;
}

/**
 * Cấu hình sắp xếp của từng bảng.
 *
 * `sortable` là whitelist bắt buộc: đưa thẳng `req.query.sortBy` vào `orderBy`
 * của Prisma là lỗ hổng — người dùng sắp xếp được theo cột bất kỳ, kể cả cột
 * không nên lộ ra ngoài. Whitelist khai báo theo từng bảng (không dùng chung
 * một danh sách) vì cột không có trong model sẽ làm Prisma ném lỗi 500.
 */
export interface SortOptions {
  sortable: readonly string[];
  defaultSort?: { field: string; order: SortOrder };
}

interface PageArgs {
  skip: number;
  take: number;
  orderBy: Record<string, SortOrder>[];
}

/**
 * Phân trang phía server dùng chung cho mọi bảng.
 *
 *   return paginate(
 *     query,
 *     { sortable: ['code', 'floor', 'createdAt'] },
 *     (page) => prisma.room.findMany({ where, ...page, include: { roomType: true } }),
 *     () => prisma.room.count({ where }),
 *   );
 *
 * Nhận hàm thay vì nhận thẳng `prisma.room`: nhờ vậy `include`/`select` viết
 * ngay tại service và kiểu dữ liệu trả về được Prisma suy ra đầy đủ.
 */
export async function paginate<T>(
  query: ListQuery,
  sort: SortOptions,
  findPage: (args: PageArgs) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const { page = 1, limit = 20, sortBy, order } = query;
  const fallback = sort.defaultSort ?? { field: 'createdAt', order: 'desc' };
  const field = sortBy && sort.sortable.includes(sortBy) ? sortBy : fallback.field;
  // `id` làm khóa phụ: sắp theo cột có giá trị trùng (tầng, trạng thái…) thì Postgres
  // không đảm bảo thứ tự giữa các dòng bằng nhau, một dòng có thể lặp/sót giữa hai trang.
  const orderBy = [{ [field]: order ?? fallback.order }, { id: 'asc' as const }];

  const [data, total] = await Promise.all([findPage({ skip: (page - 1) * limit, take: limit, orderBy }), count()]);
  return { data, meta: { page, limit, total } };
}

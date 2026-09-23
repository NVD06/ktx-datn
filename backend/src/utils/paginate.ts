import type { PaginationMeta } from '../types/response.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface ListQuery {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  order?: unknown;
}

export type SortOrder = 'asc' | 'desc';

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

export interface PageArgs {
  skip: number;
  take: number;
  orderBy: Record<string, SortOrder>[];
}

export function parseQuery(q: ListQuery, sort: SortOptions) {
  const rawPage = Number(q.page ?? 1);
  const rawLimit = Number(q.limit ?? DEFAULT_LIMIT);

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : DEFAULT_LIMIT;

  const fallback = sort.defaultSort ?? { field: 'createdAt', order: 'desc' };
  const requested = typeof q.sortBy === 'string' && sort.sortable.includes(q.sortBy);

  const sortBy = requested ? (q.sortBy as string) : fallback.field;
  const order: SortOrder = q.order === 'asc' || q.order === 'desc' ? q.order : fallback.order;

  // `id` làm khóa phụ: sắp theo cột có giá trị trùng (tầng, trạng thái…) thì Postgres
  // không đảm bảo thứ tự giữa các dòng bằng nhau, một dòng có thể lặp/sót giữa hai trang.
  const orderBy = [{ [sortBy]: order }, { id: 'asc' as const }];

  return { skip: (page - 1) * limit, take: limit, orderBy, page, limit };
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
  const { page, limit, ...args } = parseQuery(query, sort);
  const [data, total] = await Promise.all([findPage(args), count()]);
  return { data, meta: { page, limit, total } };
}

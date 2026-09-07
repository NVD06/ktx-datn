import type { PaginationMeta } from '../types/response.js';

/**
 * Danh sách cột được phép sắp xếp.
 *
 * Bắt buộc phải có whitelist: đưa thẳng `req.query.sortBy` vào `orderBy` của
 * Prisma là lỗ hổng — người dùng sắp xếp được theo cột bất kỳ, kể cả cột
 * không nên lộ ra ngoài.
 */
const SORTABLE = [
  'createdAt',
  'updatedAt',
  'code',
  'name',
  'email',
  'fullName',
  'floor',
  'status',
  'dueDate',
  'amount',
  'checkDate',
  'startDate',
  'endDate',
] as const;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface ListQuery {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  order?: unknown;
}

export function parseQuery(q: ListQuery) {
  const rawPage = Number(q.page ?? 1);
  const rawLimit = Number(q.limit ?? DEFAULT_LIMIT);

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : DEFAULT_LIMIT;

  const sortBy =
    typeof q.sortBy === 'string' && (SORTABLE as readonly string[]).includes(q.sortBy)
      ? q.sortBy
      : 'createdAt';
  const order = q.order === 'asc' ? 'asc' : 'desc';

  return { skip: (page - 1) * limit, take: limit, orderBy: { [sortBy]: order }, page, limit };
}

/**
 * Chỉ cần Prisma delegate có findMany + count — đủ cho mọi model.
 *
 * `args` để `any` là cố ý: kiểu tham số thật của Prisma (`SelectSubset<...>`)
 * quá chặt để mô tả tổng quát, nhưng kiểu *trả về* vẫn được suy ra đầy đủ nên
 * `data` ở đầu ra vẫn có kiểu đúng của model.
 */
interface Delegate<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany(args: any): Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count(args: any): Promise<number>;
}

/**
 * Phân trang phía server dùng chung cho mọi bảng.
 *
 *   return paginate(prisma.room, { ...filters, ...buildingScope(user) }, req.query);
 *
 * `extra` để truyền thêm `select` / `include` khi cần.
 */
export async function paginate<T>(
  model: Delegate<T>,
  where: Record<string, unknown>,
  query: ListQuery,
  extra: Record<string, unknown> = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const { skip, take, orderBy, page, limit } = parseQuery(query);

  const [data, total] = await Promise.all([
    model.findMany({ where, skip, take, orderBy, ...extra }),
    model.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

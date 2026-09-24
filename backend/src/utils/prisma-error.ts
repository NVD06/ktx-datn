import { Prisma } from '../generated/prisma/client.js';

/**
 * Lỗi trùng (P2002) do đúng unique index `index` gây ra — để service đổi thành
 * thông báo nghiệp vụ cụ thể thay vì lỗi "Dữ liệu bị trùng" chung chung của
 * error-handler.
 *
 * Qua driver adapter `pg` (Prisma 7), tên index nằm ở
 * `meta.driverAdapterError.cause.constraint.index`.
 */
export function isUniqueViolation(err: unknown, index: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
  const adapterError = err.meta?.driverAdapterError as
    | { cause?: { constraint?: { index?: string } } }
    | undefined;
  return adapterError?.cause?.constraint?.index === index;
}

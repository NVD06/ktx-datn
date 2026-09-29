import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { paginate } from '../../utils/paginate.js';
import { outOfScope } from '../../utils/scope.js';
import { CONTRACT_BED_SELECT, CONTRACT_STUDENT_SELECT, contractScope } from '../contracts/contract.service.js';
import { studentSearch } from '../profile/profile.service.js';
import { overdueWhere } from './invoice-rules.js';
import type { InvoiceListQuery } from './invoice.schema.js';

/*
 * Hóa đơn (US-04.3) — chỉ đọc. Hóa đơn được lập ở nơi khác: tiền phòng khi ký /
 * gia hạn hợp đồng (contract.service.ts), điện nước khi chốt chỉ số (US-04.2).
 * Phạm vi đi theo hợp đồng: SV thấy hóa đơn của mình, Manager thấy tòa mình.
 */

const LIST_INCLUDE = {
  contract: {
    select: {
      id: true,
      code: true,
      bed: { select: CONTRACT_BED_SELECT },
      registration: { select: { student: { select: CONTRACT_STUDENT_SELECT } } },
    },
  },
} as const satisfies Prisma.InvoiceInclude;

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  items: { omit: { invoiceId: true, createdAt: true }, orderBy: { type: 'asc' } },
  // Lượt bấm thanh toán rồi bỏ dở (còn PENDING) không phải lịch sử — chỉ hiện giao dịch đã có kết quả.
  payments: {
    where: { status: { not: 'PENDING' } },
    select: { id: true, amount: true, status: true, vnpTransactionNo: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
} as const satisfies Prisma.InvoiceInclude;

/** Đưa sinh viên lên thẳng `contract.student` — FE không cần biết đi qua đơn đăng ký. */
function toDto<R extends { contract: { registration: { student: object } } }>({
  contract: { registration, ...contract },
  ...invoice
}: R) {
  return { ...invoice, contract: { ...contract, student: registration.student } };
}

function invoiceScope(user: AuthUser): Prisma.InvoiceWhereInput {
  return { contract: contractScope(user) };
}

/** Lọc theo kỳ ("2026-09") đi qua ô tìm kiếm — `search` khớp cả mã hóa đơn, kỳ, tên / mã SV. */
function listWhere(user: AuthUser, { search, status, type }: InvoiceListQuery): Prisma.InvoiceWhereInput {
  const contains = search && { contains: search, mode: 'insensitive' as const };
  return {
    AND: [
      invoiceScope(user),
      contains
        ? { OR: [{ code: contains }, { period: contains }, { contract: { registration: { student: studentSearch(contains.contains) } } }] }
        : {},
      status === 'OVERDUE' ? overdueWhere(new Date()) : status ? { status } : {},
      type ? { type } : {},
    ],
  };
}

/** Bảng hóa đơn của ADMIN/MANAGER. */
export async function list(user: AuthUser, query: InvoiceListQuery) {
  const where = listWhere(user, query);
  const result = await paginate(
    query,
    { sortable: ['createdAt', 'dueDate', 'amount', 'code'], defaultSort: { field: 'createdAt', order: 'desc' } },
    (page) => prisma.invoice.findMany({ where, ...page, include: LIST_INCLUDE }),
    () => prisma.invoice.count({ where }),
  );
  return { data: result.data.map(toDto), meta: result.meta };
}

/** Tổng tiền theo đúng bộ lọc của bảng: tất cả / chưa thu / quá hạn. */
export async function summary(user: AuthUser, query: InvoiceListQuery) {
  const where = listWhere(user, query);
  const sum = (extra: Prisma.InvoiceWhereInput) =>
    prisma.invoice.aggregate({ where: { AND: [where, extra] }, _sum: { amount: true }, _count: { _all: true } });
  const [all, unpaid, overdue] = await Promise.all([sum({}), sum({ status: 'UNPAID' }), sum(overdueWhere(new Date()))]);
  // Tiền trả dạng chuỗi như mọi chỗ khác (Decimal không mất chính xác); không có dòng nào thì "0".
  const total = (r: typeof all) => ({ count: r._count._all, amount: String(r._sum.amount ?? 0) });
  return { all: total(all), unpaid: total(unpaid), overdue: total(overdue) };
}

/**
 * Hóa đơn của sinh viên đang đăng nhập — chưa thanh toán lên đầu (hạn gần nhất
 * trước), rồi đến đã thanh toán (mới nhất trước). Mỗi kỳ vài hóa đơn nên không phân trang.
 */
export async function listMine(user: AuthUser) {
  const rows = await prisma.invoice.findMany({ where: invoiceScope(user), include: LIST_INCLUDE });
  return rows
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'UNPAID' ? -1 : 1;
      return a.status === 'UNPAID' ? +a.dueDate - +b.dueDate : +b.createdAt - +a.createdAt;
    })
    .map(toDto);
}

/** Chi tiết: các dòng (chỉ số, số lượng, đơn giá, thành tiền) và lịch sử thanh toán. */
export async function getById(user: AuthUser, id: string) {
  const row = await prisma.invoice.findFirst({
    where: { AND: [{ id }, invoiceScope(user)] },
    include: DETAIL_INCLUDE,
  });
  if (!row) throw outOfScope(user, 'Không tìm thấy hóa đơn');
  return toDto(row);
}

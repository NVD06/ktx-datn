import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { formatDateVN, startOfDayVN } from '../../utils/date-vn.js';
import { paginate } from '../../utils/paginate.js';
import { outOfScope, ownBuildingScope } from '../../utils/scope.js';
import { sendPersonal } from '../announcements/announcement.service.js';
import { CONTRACT_BED_SELECT, CONTRACT_STUDENT_SELECT, contractScope } from '../contracts/contract.service.js';
import { studentSearch } from '../profile/profile.service.js';
import { BUILDING_REF_SELECT } from '../rooms/room.service.js';
import { overdueWhere } from './invoice-rules.js';
import type { InvoiceListQuery, RemindInvoicesInput } from './invoice.schema.js';

/*
 * Hóa đơn (US-04.3) — chỉ đọc, và nhắc nộp tiền. Hóa đơn được lập ở nơi khác: tiền phòng khi ký hợp
 * đồng và vào đầu mỗi tháng (room-fee.service.ts), điện nước khi chốt chỉ số (US-04.2).
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
  createdBy: { select: { fullName: true } },
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

/** Số hóa đơn và tổng tiền thỏa `where`. Tiền trả dạng chuỗi như mọi chỗ khác; không có dòng nào thì "0". */
async function total(where: Prisma.InvoiceWhereInput) {
  const r = await prisma.invoice.aggregate({ where, _sum: { amount: true }, _count: { _all: true } });
  return { count: r._count._all, amount: String(r._sum.amount ?? 0) };
}

/** Tổng tiền chưa thu / quá hạn trong phạm vi — ô công nợ của dashboard (US-06.1). */
export async function summary(user: AuthUser) {
  const where = invoiceScope(user);
  const [unpaid, overdue] = await Promise.all([
    total({ AND: [where, { status: 'UNPAID' }] }),
    total({ AND: [where, overdueWhere(new Date())] }),
  ]);
  return { unpaid, overdue };
}

/**
 * Công nợ từng tòa trong phạm vi (US-04.6): chưa thu và quá hạn. Manager chỉ có tòa mình.
 * Mỗi tòa hai lệnh aggregate — KTX chỉ vài tòa nên không cần gộp thành một câu SQL.
 */
export async function debtByBuilding(user: AuthUser) {
  const buildings = await prisma.building.findMany({
    where: ownBuildingScope(user),
    select: BUILDING_REF_SELECT,
    orderBy: { name: 'asc' },
  });
  const now = new Date();
  return Promise.all(
    buildings.map(async (building) => {
      const inBuilding: Prisma.InvoiceWhereInput = { contract: { bed: { room: { buildingId: building.id } } } };
      const [unpaid, overdue] = await Promise.all([
        total({ AND: [inBuilding, { status: 'UNPAID' }] }),
        total({ AND: [inBuilding, overdueWhere(now)] }),
      ]);
      return { building, unpaid, overdue };
    }),
  );
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

const money = (amount: unknown) => `${Number(amount).toLocaleString('vi-VN')} đ`;

/**
 * Nhắc nộp tiền: gửi thông báo riêng cho SV của các hóa đơn chưa thanh toán trong phạm vi — một SV
 * nhiều hóa đơn nhận một thông báo gộp. `invoiceIds` bỏ trống thì nhắc mọi hóa đơn chưa thanh toán.
 * Hóa đơn đã nhắc trong hôm nay thì bỏ qua: UPDATE có điều kiện ... RETURNING giành quyền nhắc từng
 * hóa đơn rồi chỉ gửi cho hóa đơn giành được, nên hai lần bấm cùng lúc cũng không gửi trùng. `invoiceIds` ngoài phạm vi thì báo lỗi.
 */
export async function remind(user: AuthUser, { invoiceIds }: RemindInvoicesInput) {
  const now = new Date();
  const today = startOfDayVN(now);
  const found = await prisma.invoice.findMany({
    where: { AND: [invoiceScope(user), invoiceIds ? { id: { in: invoiceIds } } : { status: 'UNPAID' }] },
    orderBy: { dueDate: 'asc' },
    select: { id: true, code: true, amount: true, dueDate: true, status: true, contract: { select: { registration: { select: { studentId: true } } } } },
  });
  if (invoiceIds && found.length < new Set(invoiceIds).size) throw outOfScope(user, 'Không tìm thấy hóa đơn');
  const unpaid = found.filter((i) => i.status === 'UNPAID');
  if (unpaid.length === 0) return { students: 0, invoices: 0, skipped: 0 };
  const ids = unpaid.map((i) => i.id);
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Invoice" SET "remindedAt" = ${now}, "updatedAt" = ${now}
      WHERE id IN (${Prisma.join(ids)}) AND ("remindedAt" IS NULL OR "remindedAt" < ${today})
      RETURNING id`;
    const claimedIds = new Set(claimed.map((i) => i.id));
    const invoices = unpaid.filter((i) => claimedIds.has(i.id)).map((i) => ({ ...i, overdue: i.dueDate < now }));
    const messages = [...Map.groupBy(invoices, (i) => i.contract.registration.studentId)].map(([recipientId, list]) => {
      const overdue = list.filter((i) => i.overdue).length;
      const total = list.reduce((sum, i) => sum + Number(i.amount), 0);
      return {
        recipientId,
        title:
          list.length === 1
            ? `Nhắc nộp tiền hóa đơn ${list[0]!.code}${overdue ? ' (đã quá hạn)' : ''}`
            : `Nhắc nộp tiền: ${list.length} hóa đơn chưa thanh toán${overdue ? `, ${overdue} đã quá hạn` : ''}`,
        content: [
          ...list.map((i) => `${i.code}: ${money(i.amount)}, hạn ${formatDateVN(i.dueDate)}${i.overdue ? ' (đã quá hạn)' : ''}`),
          `Tổng cần thanh toán ${money(total)}. Thanh toán trực tuyến ở trang Hóa đơn.`,
        ].join('\n'),
      };
    });
    await sendPersonal(user.id, messages, tx);
    return { students: messages.length, invoices: invoices.length, skipped: ids.length - invoices.length };
  });
}

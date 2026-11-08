import { CONTRACT_EXPIRING_DAYS, HYGIENE_WARNING_SCORE } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { RequestStatus, type InvoiceType } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { currentMonthVN, monthCount, monthStartVN, nextMonthStartVN, shiftMonth } from '../../utils/date-vn.js';
import { buildingScope, outOfScope, ownBuildingScope } from '../../utils/scope.js';
import { CONTRACT_STUDENT_SELECT, contractScope } from '../contracts/contract.service.js';
import * as invoiceService from '../invoices/invoice.service.js';
import { studentSearch } from '../profile/profile.service.js';
import { reviewerScope } from '../registrations/registration.service.js';
import { BED_STATE_SELECT, summarizeBeds } from '../rooms/room-status.js';
import { ROOM_REF_SELECT } from '../rooms/room.service.js';
import type { DebtorQuery, MonthRangeQuery, OccupancyQuery } from './report.schema.js';

/*
 * Thống kê & báo cáo (US-06) — chỉ đọc, tính thẳng từ dữ liệu nghiệp vụ bằng count / groupBy /
 * aggregate, không lưu bảng thống kê riêng. Phạm vi đi qua đúng scope của các màn hình nghiệp vụ
 * (buildingScope, contractScope), nên Manager chỉ thấy tòa mình và số khớp với các bảng đó.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Biểu đồ doanh thu của dashboard: từng này tháng gần nhất, tính cả tháng này. */
const REVENUE_MONTHS = 6;

/**
 * Phòng tính vào sức chứa: phòng đang hoạt động. Dashboard và báo cáo lấp đầy dùng chung,
 * nên tổng các tòa ở báo cáo luôn bằng ô "Tỷ lệ lấp đầy".
 */
const COUNTED_ROOM = { isActive: true } as const satisfies Prisma.RoomWhereInput;

/**
 * Doanh thu trong [gte, lt): tiền thật đã thu — giao dịch VNPay thành công có `paidAt` trong
 * khoảng, không phải hóa đơn đã lập. Tách tiền phòng / điện nước theo loại hóa đơn.
 */
async function revenueBetween(user: AuthUser, gte: Date, lt: Date) {
  const sum = async (type: InvoiceType) => {
    const { _sum } = await prisma.payment.aggregate({
      where: { status: 'SUCCESS', paidAt: { gte, lt }, invoice: { type, contract: contractScope(user) } },
      _sum: { amount: true },
    });
    return String(_sum.amount ?? 0);
  };
  const [roomFee, utility] = await Promise.all([sum('ROOM_FEE'), sum('UTILITY')]);
  return { roomFee, utility };
}
function revenueByMonth(user: AuthUser, from: string, to: string) {
  return Promise.all(
    Array.from({ length: monthCount(from, to) }, async (_, i) => {
      const month = shiftMonth(from, i);
      return { month, ...(await revenueBetween(user, monthStartVN(month), nextMonthStartVN(month))) };
    }),
  );
}

/** Số yêu cầu sửa chữa theo trạng thái — đủ mọi trạng thái, không có thì 0. */
async function requestsByStatus(user: AuthUser, where: Prisma.MaintenanceRequestWhereInput = {}) {
  const groups = await prisma.maintenanceRequest.groupBy({
    by: ['status'],
    where: { AND: [{ room: buildingScope(user) }, where] },
    _count: { _all: true },
  });
  return Object.fromEntries(
    Object.values(RequestStatus).map((status) => [status, groups.find((g) => g.status === status)?._count._all ?? 0]),
  ) as Record<RequestStatus, number>;
}

/**
 * Số liệu dashboard (US-06.1).
 *   - Lấp đầy: giường OCCUPIED / tổng giường của phòng đang hoạt động.
 *   - SV đang ở: cùng quy tắc với chỗ ở hiện tại (contract.service.ts → currentStay) — hợp đồng
 *     ACTIVE đã tới ngày vào ở, kể cả quá ngày kết thúc mà chưa trả phòng.
 *   - Công nợ: dùng lại hàm tổng của module hóa đơn, cùng phạm vi với trang Hóa đơn.
 */
export async function overview(user: AuthUser) {
  const now = new Date();
  const contracts = contractScope(user);
  const beds: Prisma.BedWhereInput = { room: { ...buildingScope(user), ...COUNTED_ROOM } };
  const thisMonth = currentMonthVN();

  const [totalBeds, occupiedBeds, residents, expiring, invoices, requests, revenue, todo, buildings, openPeriod, recentUsers] =
    await Promise.all([
      prisma.bed.count({ where: beds }),
      prisma.bed.count({ where: { ...beds, status: 'OCCUPIED' } }),
      // Đếm sinh viên chứ không đếm hợp đồng: SV quá hạn chưa trả phòng mà đã vào ở kỳ mới có hai hợp đồng ACTIVE.
      prisma.user.count({
        where: { registrations: { some: { contract: { is: { AND: [contracts, { status: 'ACTIVE', startDate: { lte: now } }] } } } } },
      }),
      prisma.contract.count({
        where: {
          AND: [contracts, { status: 'ACTIVE', endDate: { gte: now, lte: new Date(now.getTime() + CONTRACT_EXPIRING_DAYS * DAY_MS) } }],
        },
      }),
      invoiceService.summary(user),
      requestsByStatus(user),
      revenueByMonth(user, shiftMonth(thisMonth, 1 - REVENUE_MONTHS), thisMonth),
      pendingWork(user, thisMonth),
      buildingStats(user, thisMonth),
      openPeriodStats(user),
      latestUsers(user),
    ]);

  return {
    beds: { total: totalBeds, occupied: occupiedBeds },
    residents,
    expiringContracts: { count: expiring, withinDays: CONTRACT_EXPIRING_DAYS },
    invoices,
    requests: { open: requests.PENDING + requests.RECEIVED, byStatus: requests },
    revenue,
    todo: { ...todo, newRequests: requests.PENDING, lowHygieneRooms: buildings.reduce((sum, b) => sum + b.lowHygieneRooms, 0) },
    buildings,
    openPeriod,
    recentUsers,
  };
}

function latestUsers(user: AuthUser) {
  if (user.role !== 'ADMIN') return [];
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
}

async function pendingWork(user: AuthUser, month: string) {
  const contracts = contractScope(user);
  const [registrations, unsignedContracts, extensionRequests, unbilledRooms] = await Promise.all([
    prisma.registration.count({ where: { AND: [await reviewerScope(user), { status: 'PENDING' }] } }),
    prisma.contract.count({ where: { AND: [contracts, { status: 'DRAFT' }] } }),
    prisma.contract.count({ where: { AND: [contracts, { status: 'ACTIVE', extensionRequestedTo: { not: null } }] } }),
    prisma.room.count({
      where: {
        ...buildingScope(user),
        beds: { some: { contracts: { some: { status: 'ACTIVE', startDate: { lt: nextMonthStartVN(month) } } } } },
        NOT: { beds: { some: { contracts: { some: { invoices: { some: { type: 'UTILITY', period: month } } } } } } },
      },
    }),
  ]);
  return { registrations, unsignedContracts, extensionRequests, unbilledRooms };
}

async function buildingStats(user: AuthUser, month: string) {
  const [buildings, debts, rooms, requests, hygiene] = await Promise.all([
    prisma.building.findMany({
      where: ownBuildingScope(user),
      select: {
        id: true,
        name: true,
        gender: true,
        floors: true,
        isActive: true,
        manager: { select: { id: true, fullName: true } },
      },
      orderBy: { name: 'asc' },
    }),
    invoiceService.debtByBuilding(user),
    prisma.room.findMany({
      where: { ...buildingScope(user), ...COUNTED_ROOM },
      select: { buildingId: true, beds: { select: { status: true } } },
    }),
    prisma.maintenanceRequest.findMany({
      where: { room: buildingScope(user), status: { in: ['PENDING', 'RECEIVED'] } },
      select: { room: { select: { buildingId: true } } },
    }),
    prisma.hygieneRecord.findMany({
      where: { room: buildingScope(user), checkDate: { gte: monthStartVN(month), lt: nextMonthStartVN(month) } },
      orderBy: { checkDate: 'desc' },
      select: { roomId: true, score: true, room: { select: { buildingId: true } } },
    }),
  ]);
  const latest = new Map<string, (typeof hygiene)[number]>();
  for (const record of hygiene) if (!latest.has(record.roomId)) latest.set(record.roomId, record);

  return buildings.map((building) => {
    const own = rooms.filter((r) => r.buildingId === building.id);
    const beds = own.flatMap((r) => r.beds);
    const scores = [...latest.values()].filter((r) => r.room.buildingId === building.id).map((r) => r.score);
    return {
      ...building,
      rooms: own.length,
      beds: { total: beds.length, occupied: beds.filter((b) => b.status === 'OCCUPIED').length },
      overdue: debts.find((d) => d.building.id === building.id)!.overdue,
      openRequests: requests.filter((r) => r.room.buildingId === building.id).length,
      hygieneAverage: scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null,
      lowHygieneRooms: scores.filter((s) => s < HYGIENE_WARNING_SCORE).length,
    };
  });
}

async function openPeriodStats(user: AuthUser) {
  const period = await prisma.registrationPeriod.findFirst({ where: { isOpen: true }, select: { id: true, name: true } });
  if (!period) return null;
  const pending = await prisma.registration.count({
    where: { AND: [await reviewerScope(user), { periodId: period.id, status: 'PENDING' }] },
  });
  return { ...period, pending };
}

/** Số giường theo trạng thái của một nhóm phòng (tầng, tòa) — bỏ `status`, chỉ có nghĩa với từng phòng. */
function bedCounts(beds: Parameters<typeof summarizeBeds>[0]) {
  const { status: _status, ...counts } = summarizeBeds(beds);
  return counts;
}

/**
 * Báo cáo lấp đầy (US-06.2): tòa → tầng → phòng, mỗi cấp đếm giường có người / giữ chỗ / trống /
 * bảo trì theo đúng quy tắc của trang phòng (room-status.ts). Một lần đọc mọi phòng trong phạm vi
 * rồi gom ở đây — KTX chỉ vài trăm phòng nên không cần groupBy theo từng cấp.
 */
export async function occupancy(user: AuthUser, { buildingId }: OccupancyQuery) {
  const [buildings, rooms] = await Promise.all([
    prisma.building.findMany({
      where: { AND: [ownBuildingScope(user), buildingId ? { id: buildingId } : {}] },
      select: { id: true, name: true, gender: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.room.findMany({
      where: { AND: [buildingScope(user), COUNTED_ROOM, buildingId ? { buildingId } : {}] },
      select: {
        id: true,
        code: true,
        floor: true,
        buildingId: true,
        roomType: { select: { name: true, capacity: true } },
        beds: { select: BED_STATE_SELECT },
      },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
    }),
  ]);
  if (buildingId && buildings.length === 0) throw outOfScope(user, 'Không tìm thấy tòa nhà');

  return buildings.map((building) => {
    const own = rooms.filter((room) => room.buildingId === building.id);
    // Phòng đã sắp theo tầng nên các tầng ra đúng thứ tự; tầng không có phòng nào thì bỏ qua.
    const floors = [...new Set(own.map((room) => room.floor))].map((floor) => {
      const onFloor = own.filter((room) => room.floor === floor);
      return {
        floor,
        ...bedCounts(onFloor.flatMap((room) => room.beds)),
        rooms: onFloor.map(({ beds, buildingId: _buildingId, ...room }) => ({ ...room, ...summarizeBeds(beds) })),
      };
    });
    return { building, ...bedCounts(own.flatMap((room) => room.beds)), floors };
  });
}
export async function revenue(user: AuthUser, { from, to }: MonthRangeQuery) {
  const [months, total] = await Promise.all([
    revenueByMonth(user, from, to),
    revenueBetween(user, monthStartVN(from), nextMonthStartVN(to)),
  ]);
  return { months, total };
}
export function debt(user: AuthUser) {
  return invoiceService.debtByBuilding(user);
}
const DEBTOR_INVOICE_SELECT = {
  amount: true,
  dueDate: true,
  contract: {
    select: {
      bed: { select: { room: { select: ROOM_REF_SELECT } } },
      registration: { select: { student: { select: CONTRACT_STUDENT_SELECT } } },
    },
  },
} as const satisfies Prisma.InvoiceSelect;
type DebtorContract = Prisma.InvoiceGetPayload<{ select: typeof DEBTOR_INVOICE_SELECT }>['contract'];
interface Debtor {
  student: DebtorContract['registration']['student'];
  room: DebtorContract['bed']['room'];
  unpaid: { count: number; amount: number };
  overdue: { count: number; amount: number };
}
export async function debtors(user: AuthUser, { search, page = 1, limit = 20 }: DebtorQuery) {
  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        { contract: contractScope(user) },
        { status: 'UNPAID' },
        search ? { contract: { registration: { student: studentSearch(search) } } } : {},
      ],
    },
    select: DEBTOR_INVOICE_SELECT,
    orderBy: { dueDate: 'asc' },
  });
  const byStudent = new Map<string, Debtor>();
  for (const { amount, dueDate, contract } of invoices) {
    const { student } = contract.registration;
    const row = byStudent.get(student.id) ?? {
      student,
      room: contract.bed.room,
      unpaid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
    };
    row.room = contract.bed.room;
    row.unpaid.count++;
    row.unpaid.amount += Number(amount);
    if (dueDate < now) {
      row.overdue.count++;
      row.overdue.amount += Number(amount);
    }
    byStudent.set(student.id, row);
  }
  const rows = [...byStudent.values()].sort(
    (a, b) =>
      b.overdue.amount - a.overdue.amount ||
      b.unpaid.amount - a.unpaid.amount ||
      a.student.fullName.localeCompare(b.student.fullName, 'vi'),
  );
  const money = ({ count, amount }: Debtor['unpaid']) => ({ count, amount: String(amount) });
  return {
    data: rows
      .slice((page - 1) * limit, page * limit)
      .map(({ student, room, unpaid, overdue }) => ({ ...student, room, unpaid: money(unpaid), overdue: money(overdue) })),
    meta: { page, limit, total: rows.length },
  };
}
function monthRange(from: string, to: string) {
  return { gte: monthStartVN(from), lt: nextMonthStartVN(to) };
}
export async function maintenance(user: AuthUser, { from, to }: MonthRangeQuery) {
  const range = monthRange(from, to);
  const [months, total, lowScores] = await Promise.all([
    Promise.all(
      Array.from({ length: monthCount(from, to) }, async (_, i) => {
        const month = shiftMonth(from, i);
        return { month, byStatus: await requestsByStatus(user, { createdAt: monthRange(month, month) }) };
      }),
    ),
    requestsByStatus(user, { createdAt: range }),
    prisma.hygieneRecord.findMany({
      where: { room: buildingScope(user), checkDate: range, score: { lt: HYGIENE_WARNING_SCORE } },
      select: { id: true, checkDate: true, score: true, note: true, room: { select: ROOM_REF_SELECT } },
      orderBy: [{ checkDate: 'desc' }, { score: 'asc' }],
    }),
  ]);
  return { requests: { months, total }, lowScores };
}

import { HYGIENE_FULL_SCORE, HYGIENE_VIOLATIONS, HYGIENE_WARNING_SCORE } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { endOfDayVN, monthOfVN, monthStartVN, nextMonthStartVN, startOfDayVN } from '../../utils/date-vn.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { findBuildingInScope, ROOM_REF_SELECT } from '../rooms/room.service.js';
import type { HygieneListQuery, HygieneSheetQuery, SaveHygieneInput } from './hygiene.schema.js';

/*
 * Chấm điểm vệ sinh (US-05.4, US-05.5), luồng ở docs/flows/maintenance-flow.md. Ban quản lý
 * chấm theo đợt: chọn tòa + ngày, đánh dấu lỗi từng phòng. Điểm trừ dồn trong tháng: đầu tháng
 * mỗi phòng 100 điểm, mỗi đợt trừ tổng điểm các lỗi. Mỗi phòng một bản ghi mỗi ngày (unique
 * roomId + checkDate) — chấm lại thì ghi đè và tính lại điểm các đợt sau trong tháng. Điểm còn
 * lại dưới HYGIENE_WARNING_SCORE là cảnh báo.
 *
 * Phạm vi: Manager chỉ chấm và xem phòng thuộc tòa mình (lồng scope qua room); SV xem điểm
 * các phòng mình đã ở, trong thời gian mình ở đó.
 */

const INCLUDE = {
  room: { select: ROOM_REF_SELECT },
  checkedBy: { select: { id: true, fullName: true } },
} as const satisfies Prisma.HygieneRecordInclude;

/** Ngày kiểm tra theo lịch Việt Nam — không chấm trước cho ngày chưa tới. */
function checkDay(date: Date) {
  const day = startOfDayVN(date);
  if (day > new Date()) throw ApiError.validation({ checkDate: ['Ngày kiểm tra không được sau hôm nay'] });
  return day;
}

/** Hợp đồng có SV ở trong ngày `day`: đã tới ngày vào ở, chưa trả phòng trước ngày đó. */
function livingOn(day: Date): Prisma.ContractWhereInput {
  return {
    startDate: { lte: endOfDayVN(day) },
    OR: [{ status: 'ACTIVE' }, { status: 'TERMINATED', terminatedAt: { gte: day } }],
  };
}

/**
 * Bảng chấm của một tòa trong một ngày: phòng đang hoạt động (và phòng đã ngừng nhưng có điểm
 * ngày đó), số SV ở ngày đó, điểm còn lại trước đợt này, điểm đã chấm nếu có — để chấm lại.
 */
export async function sheet(user: AuthUser, { buildingId, checkDate }: HygieneSheetQuery) {
  const { name } = await findBuildingInScope(user, buildingId);
  const day = checkDay(checkDate);

  const [rooms, before] = await Promise.all([
    prisma.room.findMany({
      where: { buildingId, OR: [{ isActive: true }, { hygiene: { some: { checkDate: day } } }] },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        floor: true,
        beds: { select: { _count: { select: { contracts: { where: livingOn(day) } } } } },
        hygiene: {
          where: { checkDate: day },
          select: { id: true, score: true, deduction: true, note: true, violations: true },
        },
      },
    }),
    prisma.hygieneRecord.groupBy({
      by: ['roomId'],
      where: { room: { buildingId }, checkDate: { gte: monthStartVN(monthOfVN(day)), lt: day } },
      _sum: { deduction: true },
    }),
  ]);
  const spent = new Map(before.map((r) => [r.roomId, r._sum.deduction ?? 0]));

  return {
    building: { id: buildingId, name },
    checkDate: day,
    rooms: rooms.map(({ beds, hygiene, ...room }) => ({
      ...room,
      residents: beds.reduce((sum, bed) => sum + bed._count.contracts, 0),
      scoreBefore: Math.max(0, HYGIENE_FULL_SCORE - (spent.get(room.id) ?? 0)),
      record: hygiene[0] ?? null,
    })),
  };
}

/**
 * Lưu điểm một đợt trong một transaction — phòng phải thuộc tòa đã chọn, chấm lại thì ghi đè.
 * Hai người cùng chấm một phòng lần đầu thì unique (roomId, checkDate) chặn người sau — 409.
 */
export async function save(user: AuthUser, { buildingId, checkDate, records }: SaveHygieneInput) {
  await findBuildingInScope(user, buildingId);
  const day = checkDay(checkDate);

  return prisma.$transaction(async (tx) => {
    const found = await tx.room.findMany({
      where: { buildingId, id: { in: records.map((r) => r.roomId) } },
      select: { id: true },
    });
    const known = new Set(found.map((room) => room.id));
    const unknown = records.findIndex((r) => !known.has(r.roomId));
    if (unknown >= 0) throw ApiError.validation({ [`records.${unknown}.roomId`]: ['Phòng không thuộc tòa này'] });

    for (const { roomId, violations } of records) {
      const deduction = violations.reduce((sum, v) => sum + HYGIENE_VIOLATIONS[v].points, 0);
      const note = violations.map((v) => HYGIENE_VIOLATIONS[v].label).join(', ') || null;
      const data = { violations, deduction, note, score: 0, checkedById: user.id };
      await tx.hygieneRecord.upsert({
        where: { roomId_checkDate: { roomId, checkDate: day } },
        create: { roomId, checkDate: day, ...data },
        update: data,
      });
    }
    const roomIds = records.map((r) => r.roomId);
    await rescore(tx, roomIds, day);

    return {
      roomCount: records.length,
      warningCount: await tx.hygieneRecord.count({
        where: { roomId: { in: roomIds }, checkDate: day, score: { lt: HYGIENE_WARNING_SCORE } },
      }),
    };
  });
}

async function rescore(tx: Prisma.TransactionClient, roomIds: string[], day: Date) {
  const month = monthOfVN(day);
  const records = await tx.hygieneRecord.findMany({
    where: { roomId: { in: roomIds }, checkDate: { gte: monthStartVN(month), lt: nextMonthStartVN(month) } },
    orderBy: { checkDate: 'asc' },
    select: { id: true, roomId: true, score: true, deduction: true },
  });
  const spent = new Map<string, number>();
  for (const r of records) {
    const total = (spent.get(r.roomId) ?? 0) + r.deduction;
    spent.set(r.roomId, total);
    const score = Math.max(0, HYGIENE_FULL_SCORE - total);
    if (score !== r.score) await tx.hygieneRecord.update({ where: { id: r.id }, data: { score } });
  }
}

/** Ô tìm kiếm của bảng điểm: mã phòng hoặc tên tòa. */
function searchWhere(q: string): Prisma.HygieneRecordWhereInput {
  const contains = { contains: q, mode: 'insensitive' } as const;
  return { room: { OR: [{ code: contains }, { building: { name: contains } }] } };
}

/** Bảng điểm cho ADMIN/MANAGER: lọc theo tháng, chỉ lần chấm dưới ngưỡng — Manager chỉ thấy tòa mình. */
export function list(user: AuthUser, query: HygieneListQuery) {
  const where: Prisma.HygieneRecordWhereInput = {
    AND: [
      { room: buildingScope(user) },
      query.search ? searchWhere(query.search) : {},
      query.month ? { checkDate: { gte: monthStartVN(query.month), lt: nextMonthStartVN(query.month) } } : {},
      query.belowWarning === undefined
        ? {}
        : { score: query.belowWarning ? { lt: HYGIENE_WARNING_SCORE } : { gte: HYGIENE_WARNING_SCORE } },
    ],
  };

  return paginate(
    query,
    { sortable: ['checkDate', 'score', 'createdAt'], defaultSort: { field: 'checkDate', order: 'desc' } },
    (page) => prisma.hygieneRecord.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.hygieneRecord.count({ where }),
  );
}

/**
 * Lịch sử điểm vệ sinh của SV: điểm của từng phòng mình đã ở, chỉ trong thời gian mình ở
 * đó — từ ngày vào ở tới lúc trả phòng (hợp đồng đang ở thì chưa có mốc cuối).
 */
export async function listMine(user: AuthUser) {
  const contracts = await prisma.contract.findMany({
    where: { registration: { studentId: user.id }, status: { in: ['ACTIVE', 'TERMINATED'] } },
    select: { startDate: true, terminatedAt: true, bed: { select: { roomId: true } } },
  });
  if (contracts.length === 0) return [];

  return prisma.hygieneRecord.findMany({
    where: {
      OR: contracts.map((c) => ({
        roomId: c.bed.roomId,
        checkDate: { gte: startOfDayVN(c.startDate), ...(c.terminatedAt ? { lte: c.terminatedAt } : {}) },
      })),
    },
    orderBy: { checkDate: 'desc' },
    include: INCLUDE,
  });
}

/** Xóa điểm chấm nhầm phòng — chấm sai lỗi thì chấm lại (ghi đè), không cần xóa. Các đợt sau trong tháng được tính lại. */
export function remove(user: AuthUser, id: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.hygieneRecord.findFirst({
      where: { id, room: buildingScope(user) },
      select: { roomId: true, checkDate: true },
    });
    if (!record) throw outOfScope(user, 'Không tìm thấy điểm vệ sinh');
    await tx.hygieneRecord.delete({ where: { id } });
    await rescore(tx, [record.roomId], record.checkDate);
    return { id };
  });
}

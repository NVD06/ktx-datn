import { HYGIENE_FULL_SCORE, HYGIENE_MARK_LIMIT, HYGIENE_VIOLATIONS, HYGIENE_WARNING_SCORE } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import {
  endOfDayVN,
  halfMonthStartVN,
  monthStartVN,
  nextHalfMonthStartVN,
  nextMonthStartVN,
  startOfDayVN,
} from '../../utils/date-vn.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { findBuildingInScope, ROOM_REF_SELECT } from '../rooms/room.service.js';
import type { HygieneListQuery, HygieneSheetQuery, SaveHygieneInput } from './hygiene.schema.js';

/*
 * Chấm điểm vệ sinh (US-05.4, US-05.5), luồng ở docs/flows/maintenance-flow.md. Ban quản lý
 * chấm theo đợt: chọn tòa + ngày, đánh dấu lỗi từng phòng. Điểm trừ dồn trong kỳ nửa tháng
 * (ngày 1–15, 16–cuối tháng): đầu kỳ mỗi phòng 100 điểm, mỗi đợt trừ tổng điểm các lỗi. Mỗi phòng
 * một bản ghi mỗi ngày (unique roomId + checkDate) — chấm lại thì ghi đè và tính lại điểm các đợt
 * sau trong kỳ. Điểm còn lại dưới HYGIENE_WARNING_SCORE là cảnh báo, kỳ đó SV ở phòng bị một dấu.
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
      where: { room: { buildingId }, checkDate: { gte: halfMonthStartVN(day), lt: day } },
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

    const roomIds = records.map((r) => r.roomId);
    const before = await tx.hygieneRecord.groupBy({
      by: ['roomId'],
      where: { roomId: { in: roomIds }, checkDate: { gte: halfMonthStartVN(day), lt: day } },
      _sum: { deduction: true },
    });
    const spent = new Map(before.map((r) => [r.roomId, r._sum.deduction ?? 0]));
    const existing = await tx.hygieneRecord.findMany({ where: { roomId: { in: roomIds }, checkDate: day }, select: { roomId: true } });
    const rescored = new Set(existing.map((r) => r.roomId));
    const rows = records.map(({ roomId, violations }) => {
      const deduction = violations.reduce((sum, v) => sum + HYGIENE_VIOLATIONS[v].points, 0);
      const note = violations.map((v) => HYGIENE_VIOLATIONS[v].label).join(', ') || null;
      const score = Math.max(0, HYGIENE_FULL_SCORE - (spent.get(roomId) ?? 0) - deduction);
      return { roomId, checkDate: day, violations, deduction, note, score, checkedById: user.id };
    });
    await tx.hygieneRecord.createMany({ data: rows.filter((r) => !rescored.has(r.roomId)) });
    for (const { roomId, checkDate, ...data } of rows.filter((r) => rescored.has(r.roomId))) {
      await tx.hygieneRecord.update({ where: { roomId_checkDate: { roomId, checkDate } }, data });
    }
    await rescore(tx, roomIds, day);
    return { roomCount: records.length, warningCount: rows.filter((r) => r.score < HYGIENE_WARNING_SCORE).length };
  });
}

async function rescore(tx: Prisma.TransactionClient, roomIds: string[], day: Date) {
  const records = await tx.hygieneRecord.findMany({
    where: { roomId: { in: roomIds }, checkDate: { gte: halfMonthStartVN(day), lt: nextHalfMonthStartVN(day) } },
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

const STAY = Prisma.sql`SELECT c.id, r."studentId", c."bedId", c."startDate", c."terminatedAt"
  FROM "Contract" c JOIN "Registration" r ON r.id = c."registrationId"
  WHERE c.status IN ('ACTIVE', 'TERMINATED')`;

/**
 * Dấu vệ sinh của các hợp đồng trong `stays` (từng dòng như STAY): số kỳ nửa tháng (giờ VN, khớp
 * halfMonthStartVN) phòng có lần chấm dưới HYGIENE_WARNING_SCORE, tới lúc trả phòng. Kỳ SV vào ở
 * giữa chừng không tính — điểm phòng kỳ đó đã bị trừ từ trước khi SV đến. `overLimit`: chỉ hợp đồng
 * quá HYGIENE_MARK_LIMIT dấu.
 */
function markRows(stays: Prisma.Sql, overLimit: boolean) {
  const local = Prisma.sql`h."checkDate" + interval '7 hours'`;
  const period = Prisma.sql`date_trunc('month', ${local}) + CASE WHEN extract(day FROM ${local}) >= 16 THEN interval '15 days' ELSE interval '0' END`;
  const startDay = Prisma.sql`date_trunc('day', s."startDate" + interval '7 hours')`;
  return prisma.$queryRaw<{ contractId: string; studentId: string; marks: number }[]>`
    SELECT s.id AS "contractId", s."studentId", COUNT(DISTINCT ${period})::int AS marks
    FROM (${stays}) s
    JOIN "Bed" b ON b.id = s."bedId"
    JOIN "HygieneRecord" h ON h."roomId" = b."roomId"
      AND h.score < ${HYGIENE_WARNING_SCORE}
      AND h."checkDate" >= ${startDay} - interval '7 hours'
      AND ${period} >= ${startDay}
      AND (s."terminatedAt" IS NULL OR h."checkDate" <= s."terminatedAt")
    GROUP BY s.id, s."studentId"
    ${overLimit ? Prisma.sql`HAVING COUNT(DISTINCT ${period}) > ${HYGIENE_MARK_LIMIT}` : Prisma.empty}`;
}

/** Số dấu theo từng hợp đồng `ids` — không truyền `ids` thì mọi hợp đồng (dùng với `overLimit`). */
export async function marksByContract(ids?: string[], overLimit = false) {
  if (ids?.length === 0) return new Map<string, number>();
  const stays = ids ? Prisma.sql`${STAY} AND c.id IN (${Prisma.join(ids)})` : STAY;
  return new Map((await markRows(stays, overLimit)).map((r) => [r.contractId, r.marks]));
}

/**
 * Số dấu của SV trong hợp đồng gần nhất đã tới ngày vào ở (hợp đồng kỳ sau chưa vào ở không tính)
 * — để xét đơn đăng ký. Không truyền `ids` thì mọi SV.
 */
export async function marksByStudent(ids?: string[], overLimit = false) {
  if (ids?.length === 0) return new Map<string, number>();
  const stays = Prisma.sql`SELECT DISTINCT ON (r."studentId") * FROM (${STAY}
    AND c."startDate" <= ${new Date()} ${ids ? Prisma.sql`AND r."studentId" IN (${Prisma.join(ids)})` : Prisma.empty}) r
    ORDER BY r."studentId", r."startDate" DESC`;
  return new Map((await markRows(stays, overLimit)).map((r) => [r.studentId, r.marks]));
}

export async function myMarks(user: AuthUser) {
  return { marks: (await marksByStudent([user.id])).get(user.id) ?? 0 };
}

/** Xóa điểm chấm nhầm phòng — chấm sai lỗi thì chấm lại (ghi đè), không cần xóa. Các đợt sau trong kỳ được tính lại. */
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

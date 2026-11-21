import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { serializable } from '../../utils/serializable.js';
import {
  periodDateIssues,
  type CreateRegistrationPeriodInput,
  type RegistrationPeriodListQuery,
  type UpdateRegistrationPeriodInput,
} from './registration-period.schema.js';

/*
 * Đợt đăng ký dùng chung toàn hệ thống, không gắn theo tòa nên không có
 * buildingScope. Quyền ghi (chỉ ADMIN) chặn ở route.
 *
 * Mỗi đợt có 2 khoảng thời gian: nhận đơn (`startAt`–`endAt`) và ở
 * (`stayStartAt`–`stayEndAt`, kỳ hạn hợp đồng sinh ra từ đợt).
 *
 * Quy tắc: tại một thời điểm chỉ có tối đa 1 đợt `isOpen`. Đợt chỉ đóng khi
 * Admin bấm đóng — không tự đóng theo `endAt`, không có cron.
 */

const INCLUDE = {
  _count: { select: { registrations: true } },
} as const satisfies Prisma.RegistrationPeriodInclude;

type PeriodRow = Prisma.RegistrationPeriodGetPayload<{ include: typeof INCLUDE }>;

function toDto({ _count, ...period }: PeriodRow) {
  return { ...period, registrationCount: _count.registrations };
}

async function findOrThrow(id: string) {
  const period = await prisma.registrationPeriod.findUnique({ where: { id }, include: INCLUDE });
  if (!period) throw ApiError.notFound('Không tìm thấy đợt đăng ký');
  return period;
}

export async function list(query: RegistrationPeriodListQuery) {
  const where: Prisma.RegistrationPeriodWhereInput = {
    AND: [
      query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {},
      query.isOpen !== undefined ? { isOpen: query.isOpen } : {},
    ],
  };

  const result = await paginate(
    query,
    {
      sortable: ['name', 'startAt', 'endAt', 'createdAt'],
      defaultSort: { field: 'startAt', order: 'desc' },
    },
    (page) => prisma.registrationPeriod.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.registrationPeriod.count({ where }),
  );
  return { data: result.data.map(toDto), meta: result.meta };
}

/** Đợt đang mở, hoặc `null` — sinh viên dùng để biết có được nộp đơn không. */
export async function getCurrent() {
  const period = await prisma.registrationPeriod.findFirst({
    where: { isOpen: true },
    include: INCLUDE,
  });
  return period ? toDto(period) : null;
}

export async function create(input: CreateRegistrationPeriodInput) {
  const period = await prisma.registrationPeriod.create({ data: input, include: INCLUDE });
  return toDto(period);
}

export async function update(id: string, input: UpdateRegistrationPeriodInput) {
  const current = await findOrThrow(id);

  // Schema chỉ so được các ngày có trong body; PATCH một phần thì ghép với ngày đang lưu.
  const issues = periodDateIssues({
    startAt: input.startAt ?? current.startAt,
    endAt: input.endAt ?? current.endAt,
    stayStartAt: input.stayStartAt ?? current.stayStartAt,
    stayEndAt: input.stayEndAt ?? current.stayEndAt,
  });
  if (Object.keys(issues).length > 0) throw ApiError.validation(issues);

  const period = await prisma.registrationPeriod.update({ where: { id }, data: input, include: INCLUDE });
  return toDto(period);
}

export async function open(id: string) {
  // Transaction để hai Admin cùng bấm mở 2 đợt khác nhau không lọt cả hai.
  const period = await serializable(async (tx) => {
    const target = await tx.registrationPeriod.findUnique({ where: { id }, include: INCLUDE });
    if (!target) throw ApiError.notFound('Không tìm thấy đợt đăng ký');
    if (target.isOpen) return target;

    if (target.endAt < new Date()) {
      throw ApiError.conflict(
        'PERIOD_ENDED',
        `Đợt "${target.name}" đã hết hạn nhận đơn nên không thể mở. Hãy sửa ngày hết hạn nhận đơn trước.`,
      );
    }

    const opened = await tx.registrationPeriod.findFirst({
      where: { isOpen: true },
      select: { name: true },
    });
    if (opened) {
      throw ApiError.conflict(
        'PERIOD_ALREADY_OPEN',
        `Đợt "${opened.name}" đang mở. Hãy đóng đợt đó trước khi mở đợt mới.`,
      );
    }

    return tx.registrationPeriod.update({ where: { id }, data: { isOpen: true }, include: INCLUDE });
  });
  return toDto(period);
}

export async function close(id: string) {
  const target = await findOrThrow(id);
  if (!target.isOpen) return toDto(target);

  const period = await prisma.registrationPeriod.update({
    where: { id },
    data: { isOpen: false },
    include: INCLUDE,
  });
  return toDto(period);
}

export async function remove(id: string) {
  const period = await findOrThrow(id);

  if (period.isOpen) {
    throw ApiError.conflict(
      'PERIOD_OPEN',
      `Đợt "${period.name}" đang mở nên không thể xóa. Hãy đóng đợt trước.`,
    );
  }
  if (period._count.registrations > 0) {
    throw ApiError.conflict(
      'PERIOD_HAS_REGISTRATIONS',
      `Đợt "${period.name}" đã có ${period._count.registrations} đơn đăng ký nên không thể xóa.`,
    );
  }

  await prisma.registrationPeriod.delete({ where: { id } });
  return { id };
}

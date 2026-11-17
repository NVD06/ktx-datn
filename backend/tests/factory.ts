import { prisma } from '../src/config/prisma.js';
import type { Gender } from '../src/generated/prisma/enums.js';
import type { AuthUser } from '../src/types/auth-user.js';

/*
 * Dựng dữ liệu tối thiểu cho từng ca test. Không dùng seed: mỗi ca cần đúng tình huống
 * của nó (đơn chờ duyệt, hợp đồng theo ngày chọn trước…).
 */

let seq = 0;
const next = () => ++seq;
const DAY = 24 * 60 * 60 * 1000;

/** Đúng các trường `requireAuth` gắn vào `req.user` — truyền thẳng vào service. */
const AUTH_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  buildingId: true,
  mustChangePassword: true,
} as const;

/** Tòa nam hoặc tòa nữ — không có tòa hỗn hợp. */
export function createBuilding(gender: Gender) {
  return prisma.building.create({ data: { name: `Tòa ${next()}`, floors: 3, gender } });
}

/** Phòng `bedCount` giường, kèm loại phòng riêng giá 1.500.000 đ. */
export async function createRoom(buildingId: string, bedCount = 2) {
  const n = next();
  const roomType = await prisma.roomType.create({
    data: { name: `Loại ${n}`, capacity: bedCount, price: 1_500_000 },
  });
  return prisma.room.create({
    data: {
      buildingId,
      roomTypeId: roomType.id,
      code: `P${n}`,
      floor: 1,
      beds: { create: Array.from({ length: bedCount }, (_, i) => ({ code: `G${i + 1}` })) },
    },
    include: { beds: { orderBy: { code: 'asc' } } },
  });
}

export function createAdmin(): Promise<AuthUser> {
  const n = next();
  return prisma.user.create({
    data: { email: `admin${n}@test.vn`, passwordHash: '-', fullName: `Quản trị ${n}`, role: 'ADMIN' },
    select: AUTH_USER_SELECT,
  });
}

export function createManager(buildingId: string): Promise<AuthUser> {
  const n = next();
  return prisma.user.create({
    data: { email: `ql${n}@test.vn`, passwordHash: '-', fullName: `Quản lý ${n}`, role: 'MANAGER', buildingId },
    select: AUTH_USER_SELECT,
  });
}

export function createStudent(gender: Gender, fullName?: string): Promise<AuthUser> {
  const n = next();
  return prisma.user.create({
    data: {
      email: `sv${n}@test.vn`,
      passwordHash: '-',
      fullName: fullName ?? `Sinh viên ${n}`,
      profile: { create: { studentCode: `SV${n}`, gender } },
    },
    select: AUTH_USER_SELECT,
  });
}

/** Đợt đang mở, thời gian ở từ hôm nay tới 5 tháng sau. */
export function createPeriod() {
  const now = Date.now();
  return prisma.registrationPeriod.create({
    data: {
      name: `Đợt ${next()}`,
      startAt: new Date(now - DAY),
      endAt: new Date(now + 30 * DAY),
      isOpen: true,
      stayStartAt: new Date(now),
      stayEndAt: new Date(now + 150 * DAY),
      term: '2026-HK1',
    },
  });
}

/** Đơn chờ duyệt; `buildingId = null` là "tòa nào cũng được". */
export function createRegistration(student: AuthUser, periodId: string, buildingId: string | null) {
  return prisma.registration.create({ data: { periodId, studentId: student.id, buildingId } });
}

/**
 * Hóa đơn tiền phòng chưa trả của SV — dựng thẳng hợp đồng ACTIVE, bỏ qua luồng duyệt và ký.
 * Không truyền `buildingId` thì tạo tòa mới; mặc định hạn 14 ngày nữa.
 */
export async function createUnpaidInvoice(
  student: AuthUser,
  { amount = 1_500_000, buildingId, dueDate }: { amount?: number; buildingId?: string; dueDate?: Date } = {},
) {
  const room = await createRoom(buildingId ?? (await createBuilding('MALE')).id, 1);
  const contract = await createActiveContract(student, room.beds[0]!, { price: amount });
  return prisma.invoice.create({
    data: {
      code: `INV-TEST-${next()}`,
      contractId: contract.id,
      type: 'ROOM_FEE',
      period: contract.period.term,
      amount,
      dueDate: dueDate ?? new Date(Date.now() + 14 * DAY),
    },
  });
}

/**
 * SV đang ở giường `bed` — dựng thẳng hợp đồng ACTIVE, bỏ qua luồng duyệt và ký.
 * Mặc định theo thời gian ở của đợt (hôm nay tới 5 tháng sau), ký ngay ngày bắt đầu.
 */
export async function createActiveContract(
  student: AuthUser,
  bed: { id: string; roomId: string },
  { price = 1_500_000, startDate, endDate, signedAt }: { price?: number; startDate?: Date; endDate?: Date; signedAt?: Date } = {},
) {
  const period = await createPeriod();
  const room = await prisma.room.findUniqueOrThrow({ where: { id: bed.roomId }, select: { buildingId: true } });
  const registration = await prisma.registration.create({
    data: { periodId: period.id, studentId: student.id, buildingId: room.buildingId, status: 'APPROVED' },
  });
  const contract = await prisma.contract.create({
    data: {
      code: `HD-TEST-${next()}`,
      registrationId: registration.id,
      bedId: bed.id,
      startDate: startDate ?? period.stayStartAt,
      endDate: endDate ?? period.stayEndAt,
      price,
      status: 'ACTIVE',
      signedAt: signedAt ?? startDate ?? period.stayStartAt,
    },
  });
  return { ...contract, period };
}

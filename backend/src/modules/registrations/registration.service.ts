import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope } from '../../utils/scope.js';
import * as profileService from '../profile/profile.service.js';
import { HOLDING_CONTRACT_STATUSES } from '../rooms/room-eligibility.js';
import { BUILDING_REF_SELECT, ROOM_TYPE_SELECT } from '../rooms/room.service.js';
import type { CreateRegistrationInput, RegistrationListQuery } from './registration.schema.js';

/*
 * Đơn đăng ký ở KTX. Phần của sinh viên (US-02.3) luôn lọc theo
 * `studentId = user.id`; phần của Manager (US-02.4) lọc theo reviewerScope.
 */

const INCLUDE = {
  period: { omit: { createdAt: true, updatedAt: true } },
  preferredRoomType: { select: ROOM_TYPE_SELECT },
} as const satisfies Prisma.RegistrationInclude;

/** Danh sách cho người duyệt kèm hồ sơ sinh viên — drawer chi tiết đọc luôn từ đây. */
const LIST_INCLUDE = {
  ...INCLUDE,
  student: { select: profileService.STUDENT_SELECT },
} as const satisfies Prisma.RegistrationInclude;

type BuildingRef = Prisma.BuildingGetPayload<{ select: typeof BUILDING_REF_SELECT }>;

function toDto<R extends { buildingId: string | null }>(
  { buildingId: _, ...row }: R,
  building: BuildingRef | null,
) {
  return { ...row, building };
}

/**
 * `buildingId` là cột scalar không có khóa ngoại (database.md), nên tên tòa
 * phải tự tra — gom một query cho cả danh sách.
 */
async function toDtos<R extends { buildingId: string | null }>(rows: R[]) {
  const ids = [...new Set(rows.flatMap((r) => (r.buildingId ? [r.buildingId] : [])))];
  const buildings = ids.length
    ? await prisma.building.findMany({ where: { id: { in: ids } }, select: BUILDING_REF_SELECT })
    : [];
  const byId = new Map(buildings.map((b) => [b.id, b]));
  return rows.map((r) => toDto(r, (r.buildingId && byId.get(r.buildingId)) || null));
}

const GENDER_LABEL = { MALE: 'nam', FEMALE: 'nữ' } as const;

/** Ngày trong thông báo lỗi, theo giờ Việt Nam: "31/01/2027". */
function formatDateVN(date: Date) {
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Đơn mà người duyệt được thấy. ADMIN: tất cả. MANAGER: đơn nguyện vọng vào tòa
 * mình **và** đơn "tòa nào cũng được" của sinh viên hợp giới tính tòa (tòa hỗn
 * hợp: mọi sinh viên) — ai duyệt trước thì nhận. Nhờ vậy đơn nào cũng có tòa
 * nhìn thấy, không có đơn mồ côi; còn đơn đã chọn tòa khác thì không lộ ra.
 */
async function reviewerScope(user: AuthUser): Promise<Prisma.RegistrationWhereInput> {
  const { buildingId } = buildingScope(user);
  if (!buildingId) return {};

  const building = await prisma.building.findUnique({ where: { id: buildingId }, select: { gender: true } });
  // Không tra được tòa thì chỉ thấy đơn chọn đích danh tòa đó — không mở rộng phạm vi.
  if (!building) return { buildingId };

  return {
    OR: [
      { buildingId },
      building.gender
        ? { buildingId: null, student: { profile: { gender: building.gender } } }
        : { buildingId: null },
    ],
  };
}

export async function list(user: AuthUser, query: RegistrationListQuery) {
  const search: Prisma.RegistrationWhereInput = query.search
    ? {
        OR: [
          { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
          { student: { email: { contains: query.search, mode: 'insensitive' } } },
          { student: { profile: { studentCode: { contains: query.search, mode: 'insensitive' } } } },
        ],
      }
    : {};
  const where: Prisma.RegistrationWhereInput = {
    AND: [
      await reviewerScope(user),
      search,
      query.status ? { status: query.status } : {},
      query.periodId ? { periodId: query.periodId } : {},
    ],
  };

  const result = await paginate(
    query,
    { sortable: ['createdAt', 'status'], defaultSort: { field: 'createdAt', order: 'desc' } },
    (page) => prisma.registration.findMany({ where, ...page, include: LIST_INCLUDE }),
    () => prisma.registration.count({ where }),
  );
  return { data: await toDtos(result.data), meta: result.meta };
}

/** Đơn của chính sinh viên, mới nhất trước — mỗi đợt tối đa vài đơn nên không phân trang. */
export async function listMine(user: AuthUser) {
  const rows = await prisma.registration.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
  return toDtos(rows);
}

export async function create(user: AuthUser, input: CreateRegistrationInput) {
  // Transaction Serializable: sinh viên bấm "Nộp" 2 lần liên tiếp không tạo ra 2 đơn.
  return prisma.$transaction(
    async (tx) => {
      const period = await tx.registrationPeriod.findFirst({
        where: { isOpen: true },
        select: { id: true, name: true, stayStartAt: true, stayEndAt: true },
      });
      if (!period) {
        throw ApiError.conflict('PERIOD_CLOSED', 'Hiện chưa có đợt đăng ký nào đang mở.');
      }

      // Sau kiểm tra đợt: chưa mở đợt thì báo điều đó trước, khỏi bắt SV đi sửa hồ sơ.
      const profile = await profileService.assertComplete(user, tx);

      let building: BuildingRef | null = null;
      if (input.buildingId) {
        const found = await tx.building.findUnique({
          where: { id: input.buildingId },
          select: { ...BUILDING_REF_SELECT, isActive: true },
        });
        if (!found?.isActive) {
          throw ApiError.validation({ buildingId: ['Tòa nhà không tồn tại hoặc đang ngừng hoạt động'] });
        }
        if (found.gender && found.gender !== profile.gender) {
          throw ApiError.validation({
            buildingId: [`Tòa ${found.name} chỉ dành cho sinh viên ${GENDER_LABEL[found.gender]}`],
          });
        }
        building = { id: found.id, name: found.name, gender: found.gender };
      }

      if (input.preferredRoomTypeId) {
        const roomType = await tx.roomType.findUnique({
          where: { id: input.preferredRoomTypeId },
          select: { name: true, isActive: true },
        });
        if (!roomType?.isActive) {
          throw ApiError.validation({
            preferredRoomTypeId: ['Loại phòng không tồn tại hoặc đã ngừng sử dụng'],
          });
        }

        // Chọn cả tòa lẫn loại phòng thì tòa đó phải có loại phòng này. Không đòi
        // còn giường trống: nguyện vọng vẫn hợp lệ, Manager có thể xếp khi có người trả phòng.
        if (building) {
          const exists = await tx.room.findFirst({
            where: { buildingId: building.id, roomTypeId: input.preferredRoomTypeId, isActive: true },
            select: { id: true },
          });
          if (!exists) {
            throw ApiError.validation({
              preferredRoomTypeId: [`Tòa đã chọn không có phòng loại "${roomType.name}"`],
            });
          }
        }
      }

      // Đơn CANCELLED/REJECTED không tính — sinh viên được nộp lại (database.md §3.3).
      const existing = await tx.registration.findFirst({
        where: { periodId: period.id, studentId: user.id, status: { in: ['PENDING', 'APPROVED'] } },
        select: { status: true },
      });
      if (existing) {
        throw ApiError.conflict(
          'REGISTRATION_EXISTS',
          existing.status === 'PENDING'
            ? `Bạn đã có đơn đang chờ duyệt trong đợt "${period.name}". Hãy hủy đơn đó nếu muốn nộp lại.`
            : `Đơn của bạn trong đợt "${period.name}" đã được duyệt, không thể nộp thêm.`,
        );
      }

      // Sinh viên đang ở vẫn được đăng ký kỳ sau, miễn hợp đồng hiện tại (đang ở
      // hoặc đã duyệt chờ ký) không trùng thời gian ở của đợt này.
      const overlapping = await tx.contract.findFirst({
        where: {
          status: { in: [...HOLDING_CONTRACT_STATUSES] },
          registration: { studentId: user.id },
          startDate: { lte: period.stayEndAt },
          endDate: { gte: period.stayStartAt },
        },
        select: { code: true, endDate: true },
      });
      if (overlapping) {
        throw ApiError.conflict(
          'CONTRACT_OVERLAP',
          `Hợp đồng ${overlapping.code} của bạn còn hiệu lực đến ${formatDateVN(overlapping.endDate)}, ` +
            `trùng thời gian ở của đợt "${period.name}". Liên hệ ban quản lý nếu muốn gia hạn.`,
        );
      }

      const row = await tx.registration.create({
        data: {
          periodId: period.id,
          studentId: user.id,
          buildingId: building?.id ?? null,
          preferredRoomTypeId: input.preferredRoomTypeId ?? null,
          note: input.note ?? null,
        },
        include: INCLUDE,
      });
      return toDto(row, building);
    },
    { isolationLevel: 'Serializable' },
  );
}

const STATUS_LABEL = {
  PENDING: 'đang chờ duyệt',
  APPROVED: 'đã được duyệt',
  REJECTED: 'đã bị từ chối',
  CANCELLED: 'đã hủy',
} as const;

/** Sinh viên hủy đơn của mình khi còn PENDING. */
export async function cancel(user: AuthUser, id: string) {
  try {
    const row = await prisma.registration.update({
      where: { id, studentId: user.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
      include: INCLUDE,
    });
    return (await toDtos([row]))[0];
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')) throw err;
  }

  // Không cập nhật được: hoặc không phải đơn của mình, hoặc đơn không còn PENDING.
  const own = await prisma.registration.findFirst({
    where: { id, studentId: user.id },
    select: { status: true },
  });
  // Đơn của người khác cũng trả 404 — không lộ việc id đó có tồn tại.
  if (!own) throw ApiError.notFound('Không tìm thấy đơn đăng ký');
  throw ApiError.conflict('REGISTRATION_NOT_PENDING', `Đơn ${STATUS_LABEL[own.status]} nên không thể hủy.`);
}

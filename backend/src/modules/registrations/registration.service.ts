import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { formatDateVN } from '../../utils/date-vn.js';
import { nextDocumentCode } from '../../utils/document-code.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import * as contractService from '../contracts/contract.service.js';
import * as profileService from '../profile/profile.service.js';
import {
  ASSIGNABLE_ROOM,
  FREE_BED,
  GENDER_LABEL,
  HOLDING_CONTRACT_STATUSES,
  OTHER_GENDER,
  roomForGender,
} from '../rooms/room-eligibility.js';
import { BUILDING_REF_SELECT, ROOM_TYPE_SELECT } from '../rooms/room.service.js';
import type {
  ApproveRegistrationInput,
  CreateRegistrationInput,
  RegistrationListQuery,
  RejectRegistrationInput,
} from './registration.schema.js';

/*
 * Đơn đăng ký ở KTX. Phần của sinh viên (US-02.3) luôn lọc theo
 * `studentId = user.id`; phần của Manager — xem danh sách (US-02.4), duyệt và
 * từ chối (US-03.1/2) — lọc theo reviewerScope.
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

/**
 * Hợp đồng đang giữ chỗ (DRAFT đã duyệt chờ ký, hoặc ACTIVE đang ở) của sinh viên
 * trùng thời gian ở của đợt. Sinh viên đang ở vẫn được đăng ký kỳ sau, miễn hợp
 * đồng hiện tại kết thúc trước khi kỳ mới bắt đầu.
 */
function findOverlappingContract(
  db: Prisma.TransactionClient,
  studentId: string,
  period: { stayStartAt: Date; stayEndAt: Date },
) {
  return db.contract.findFirst({
    where: {
      status: { in: [...HOLDING_CONTRACT_STATUSES] },
      registration: { studentId },
      startDate: { lte: period.stayEndAt },
      endDate: { gte: period.stayStartAt },
    },
    select: { code: true, endDate: true },
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
  const where: Prisma.RegistrationWhereInput = {
    AND: [
      await reviewerScope(user),
      query.search ? { student: profileService.studentSearch(query.search) } : {},
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

      const overlapping = await findOverlappingContract(tx, user.id, period);
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

// ── Duyệt / từ chối (US-03.1, US-03.2) ──────────────────────────────────────

/**
 * Đơn không còn PENDING. Vừa đọc thấy PENDING mà ghi không được nghĩa là người
 * khác vừa xử lý xong trong lúc mình đang thao tác.
 */
function notPendingError(status: keyof typeof STATUS_LABEL, action: string) {
  return ApiError.conflict(
    'REGISTRATION_NOT_PENDING',
    status === 'PENDING'
      ? 'Đơn vừa được người khác xử lý. Hãy tải lại danh sách.'
      : `Đơn ${STATUS_LABEL[status]} nên không thể ${action}.`,
  );
}

/**
 * Duyệt đơn: xếp giường và sinh hợp đồng DRAFT chờ sinh viên ký.
 *
 * Tranh chấp giường (registration-contract-flow.md): duyệt xong giường vẫn
 * AVAILABLE, chỉ có thêm hợp đồng DRAFT — hai lệnh duyệt song song ở READ
 * COMMITTED đều đọc thấy giường trống. Vì vậy phải KHÓA DÒNG PHÒNG trước rồi mới
 * kiểm tra: lệnh sau vào cùng phòng phải chờ lệnh trước commit, và khi đọc lại
 * sẽ thấy hợp đồng DRAFT vừa tạo. Khóa theo phòng chứ không theo giường vì ở tòa
 * hỗn hợp, xếp nam và nữ vào hai giường khác nhau của cùng một phòng trống cũng
 * là tranh chấp. Lọt qua hết thì unique index của Contract chặn nốt.
 *
 * Thứ tự khóa luôn là đơn → phòng, nên hai lệnh duyệt không thể chờ nhau vòng tròn.
 */
export async function approve(user: AuthUser, id: string, input: ApproveRegistrationInput) {
  const scope = await reviewerScope(user);

  const contractId = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findFirst({
      where: { AND: [{ id }, scope] },
      select: {
        status: true,
        buildingId: true,
        studentId: true,
        period: { select: { name: true, stayStartAt: true, stayEndAt: true } },
        student: { select: { profile: { select: { gender: true } } } },
      },
    });
    if (!registration) throw outOfScope(user, 'Không tìm thấy đơn đăng ký');

    // Đổi trạng thái NGAY để giữ khóa dòng của đơn: hai người cùng duyệt một đơn
    // thì người sau chờ ở đây, rồi nhận count = 0 vì đơn không còn PENDING.
    // Các bước sau lỗi thì cả transaction rollback, đơn vẫn PENDING.
    const { count } = await tx.registration.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedById: user.id },
    });
    if (count === 0) throw notPendingError(registration.status, 'duyệt');

    // Hợp đồng lấy kỳ hạn từ thời gian ở của đợt — đợt đã hết thì hợp đồng sinh ra
    // đã hết hạn trước khi sinh viên kịp ký.
    if (registration.period.stayEndAt < new Date()) {
      throw ApiError.conflict(
        'PERIOD_STAY_ENDED',
        `Thời gian ở của đợt "${registration.period.name}" đã kết thúc nên không thể xếp giường. ` +
          'Hãy từ chối đơn, hoặc nhờ quản trị viên sửa thời gian ở của đợt.',
      );
    }

    const bed = await tx.bed.findFirst({
      where: { id: input.bedId, room: buildingScope(user) },
      select: { id: true, code: true, roomId: true, room: { select: { buildingId: true } } },
    });
    if (!bed) {
      throw ApiError.validation({ bedId: ['Giường không tồn tại hoặc không thuộc tòa bạn quản lý'] });
    }

    // Nguyện vọng tòa là bắt buộc; nguyện vọng loại phòng chỉ để tham khảo —
    // loại SV chọn đã hết chỗ thì Manager được xếp loại khác.
    if (registration.buildingId && registration.buildingId !== bed.room.buildingId) {
      const wanted = await tx.building.findUnique({
        where: { id: registration.buildingId },
        select: { name: true },
      });
      throw ApiError.validation({
        bedId: [`Sinh viên đăng ký ở tòa ${wanted?.name ?? 'khác'}, hãy chọn giường trong tòa đó`],
      });
    }

    await tx.$executeRaw`SELECT 1 FROM "Room" WHERE id = ${bed.roomId} FOR UPDATE`;

    // ── Từ đây mọi thứ được đọc lại SAU khi đã giữ khóa phòng. ──
    const room = await tx.room.findUniqueOrThrow({
      where: { id: bed.roomId },
      select: {
        code: true,
        building: { select: { name: true, gender: true } },
        roomType: { select: { price: true } },
      },
    });

    const assignable = await tx.room.count({ where: { id: bed.roomId, ...ASSIGNABLE_ROOM } });
    if (!assignable) {
      throw ApiError.conflict(
        'ROOM_UNAVAILABLE',
        `Phòng ${room.code} tòa ${room.building.name} đang ngừng hoạt động hoặc thuộc loại phòng đã ngừng sử dụng.`,
      );
    }

    const free = await tx.bed.count({ where: { id: bed.id, ...FREE_BED } });
    if (!free) {
      throw ApiError.conflict(
        'BED_TAKEN',
        `Giường ${bed.code} phòng ${room.code} vừa được xếp cho sinh viên khác hoặc không còn trống. Hãy chọn giường khác.`,
      );
    }

    const gender = registration.student.profile?.gender;
    if (!gender) {
      throw ApiError.conflict('PROFILE_INCOMPLETE', 'Hồ sơ sinh viên chưa có giới tính nên chưa xếp được phòng.');
    }
    const fits = await tx.room.count({ where: { AND: [{ id: bed.roomId }, roomForGender(gender)] } });
    if (!fits) {
      throw ApiError.conflict(
        'ROOM_GENDER_MISMATCH',
        room.building.gender
          ? `Tòa ${room.building.name} chỉ dành cho sinh viên ${GENDER_LABEL[room.building.gender]}.`
          : `Phòng ${room.code} đã có sinh viên ${GENDER_LABEL[OTHER_GENDER[gender]]} ở hoặc được xếp vào.`,
      );
    }

    // Lúc nộp đơn đã kiểm tra, nhưng từ đó tới nay SV có thể đã được duyệt ở đợt khác.
    const { period } = registration;
    const overlapping = await findOverlappingContract(tx, registration.studentId, period);
    if (overlapping) {
      throw ApiError.conflict(
        'CONTRACT_OVERLAP',
        `Sinh viên đã có hợp đồng ${overlapping.code} trùng thời gian ở của đợt "${period.name}".`,
      );
    }

    const contract = await tx.contract.create({
      data: {
        code: await nextDocumentCode(tx, 'HD'),
        registrationId: id,
        bedId: bed.id,
        // Kỳ hạn = thời gian Ở của đợt (không phải thời gian nhận đơn).
        startDate: period.stayStartAt,
        endDate: period.stayEndAt,
        // Snapshot: Admin đổi giá loại phòng sau này không ảnh hưởng hợp đồng.
        price: room.roomType.price,
      },
      select: { id: true },
    });
    return contract.id;
  });

  return contractService.getById(user, contractId);
}

/** Từ chối đơn PENDING, bắt buộc kèm lý do để sinh viên biết vì sao. */
export async function reject(user: AuthUser, id: string, input: RejectRegistrationInput) {
  const scope = await reviewerScope(user);

  // Điều kiện PENDING nằm ngay trong lệnh ghi: không có khoảng hở giữa lúc kiểm
  // tra và lúc ghi để một lệnh duyệt chen vào.
  const { count } = await prisma.registration.updateMany({
    where: { AND: [{ id, status: 'PENDING' }, scope] },
    data: { status: 'REJECTED', reviewedById: user.id, reviewNote: input.reviewNote },
  });
  if (count === 0) {
    const current = await prisma.registration.findFirst({
      where: { AND: [{ id }, scope] },
      select: { status: true },
    });
    if (!current) throw outOfScope(user, 'Không tìm thấy đơn đăng ký');
    throw notPendingError(current.status, 'từ chối');
  }

  const row = await prisma.registration.findUniqueOrThrow({ where: { id }, include: LIST_INCLUDE });
  return (await toDtos([row]))[0];
}

import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { RequestStatus } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { studentSearch } from '../profile/profile.service.js';
import { ROOM_REF_SELECT } from '../rooms/room.service.js';
import type {
  CreateMaintenanceInput,
  MaintenanceListQuery,
  UpdateMaintenanceStatusInput,
} from './maintenance.schema.js';

/*
 * Yêu cầu sửa chữa (US-05.1 → US-05.3), sơ đồ trạng thái ở docs/flows/maintenance-flow.md.
 * SV gửi cho phòng đang ở — phòng lấy từ hợp đồng, SV không tự chọn. Ban quản lý tòa đó
 * chuyển lần lượt PENDING → RECEIVED → DONE, hoặc từ chối khi còn PENDING;
 * SV xác nhận DONE → CONFIRMED. Không mở lại: chưa hài lòng thì gửi yêu cầu mới.
 *
 * Phạm vi: SV chỉ thấy yêu cầu của mình; Manager thấy yêu cầu của phòng thuộc tòa mình
 * (lồng scope qua room); Admin thấy tất cả.
 */

const INCLUDE = {
  room: { select: ROOM_REF_SELECT },
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      profile: { select: { studentCode: true, className: true } },
    },
  },
  handledBy: { select: { id: true, fullName: true } },
} as const satisfies Prisma.MaintenanceRequestInclude;

type Step = Exclude<RequestStatus, 'PENDING'>;

/** Mỗi bước: trạng thái phải có ngay trước nó (không nhảy cóc) và cột ghi mốc thời gian. */
const STEPS = {
  RECEIVED: { from: 'PENDING', stamp: 'receivedAt' },
  DONE: { from: 'RECEIVED', stamp: 'doneAt' },
  CONFIRMED: { from: 'DONE', stamp: 'confirmedAt' },
  REJECTED: { from: 'PENDING', stamp: 'rejectedAt' },
} as const satisfies Record<Step, { from: RequestStatus; stamp: keyof Prisma.MaintenanceRequestUpdateManyMutationInput }>;

/** Giữ khớp với REQUEST_STATUS ở frontend/src/lib/labels.ts. */
const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Chờ tiếp nhận',
  RECEIVED: 'Đã tiếp nhận',
  DONE: 'Đã sửa xong',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
};

function requestScope(user: AuthUser): Prisma.MaintenanceRequestWhereInput {
  if (user.role === 'STUDENT') return { studentId: user.id };
  return { room: buildingScope(user) };
}

/**
 * SV gửi yêu cầu cho phòng đang ở: hợp đồng ACTIVE đã bắt đầu — kể cả quá ngày kết thúc mà
 * chưa trả phòng (giống contract.service.ts → currentStay). Đã ký cho kỳ sau mà chưa tới
 * ngày vào ở thì chưa có phòng để báo hỏng.
 */
export async function create(user: AuthUser, input: CreateMaintenanceInput) {
  const contract = await prisma.contract.findFirst({
    // TẠM ĐỂ TEST: bỏ điều kiện đã tới ngày vào ở — trả lại `startDate: { lte: new Date() }` trước khi commit.
    where: { status: 'ACTIVE', registration: { studentId: user.id } },
    orderBy: { startDate: 'desc' },
    select: { bed: { select: { roomId: true } } },
  });
  if (!contract) {
    throw ApiError.conflict('NO_ACTIVE_CONTRACT', 'Bạn chưa ở phòng nào của KTX nên chưa gửi được yêu cầu sửa chữa.');
  }

  // Tạo rồi mới đọc kèm quan hệ: `create` kèm nhiều `include` thì Prisma đọc các quan hệ song song
  // trên cùng một kết nối của transaction ngầm, pg cảnh báo (pg@9 sẽ báo lỗi).
  const { id } = await prisma.maintenanceRequest.create({
    data: { ...input, roomId: contract.bed.roomId, studentId: user.id },
    select: { id: true },
  });
  return prisma.maintenanceRequest.findUniqueOrThrow({ where: { id }, include: INCLUDE });
}

/** Yêu cầu của SV đang đăng nhập, mới nhất trước. */
export function listMine(user: AuthUser) {
  return prisma.maintenanceRequest.findMany({
    where: requestScope(user),
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
}

/** Ô tìm kiếm của bảng: tiêu đề, mã phòng, tên / email / mã SV. */
function searchWhere(q: string): Prisma.MaintenanceRequestWhereInput {
  const contains = { contains: q, mode: 'insensitive' } as const;
  return { OR: [{ title: contains }, { room: { code: contains } }, { student: studentSearch(q) }] };
}

/** Bảng yêu cầu cho ADMIN/MANAGER — Manager chỉ thấy phòng thuộc tòa mình. */
export function list(user: AuthUser, query: MaintenanceListQuery) {
  const where: Prisma.MaintenanceRequestWhereInput = {
    AND: [
      requestScope(user),
      query.search ? searchWhere(query.search) : {},
      query.status ? { status: query.status } : {},
    ],
  };

  return paginate(
    query,
    { sortable: ['createdAt', 'status'], defaultSort: { field: 'createdAt', order: 'desc' } },
    (page) => prisma.maintenanceRequest.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.maintenanceRequest.count({ where }),
  );
}

/**
 * Chuyển sang bước `to` — ghi có điều kiện: trạng thái liền trước và phạm vi nằm ngay trong
 * lệnh ghi, nên hai người cùng bấm thì người sau nhận count = 0. Khi đó đọc lại để báo đúng
 * lý do: không thấy yêu cầu (ngoài phạm vi) hay yêu cầu không ở bước liền trước (409).
 */
async function transition(user: AuthUser, id: string, to: Step, data: Prisma.MaintenanceRequestUncheckedUpdateManyInput = {}) {
  const scope = requestScope(user);
  const { from, stamp } = STEPS[to];
  const { count } = await prisma.maintenanceRequest.updateMany({
    where: { AND: [{ id, status: from }, scope] },
    data: { ...data, status: to, [stamp]: new Date() },
  });

  if (count === 0) {
    const current = await prisma.maintenanceRequest.findFirst({ where: { AND: [{ id }, scope] }, select: { status: true } });
    if (!current) throw outOfScope(user, 'Không tìm thấy yêu cầu sửa chữa');
    throw ApiError.conflict(
      'INVALID_STATUS_TRANSITION',
      `Yêu cầu đang ở trạng thái "${STATUS_LABEL[current.status]}" nên không chuyển sang "${STATUS_LABEL[to]}" được. ` +
        'Trạng thái chỉ chuyển lần lượt từng bước.',
    );
  }

  return prisma.maintenanceRequest.findUniqueOrThrow({ where: { id }, include: INCLUDE });
}

/** Ban quản lý chuyển bước kế tiếp hoặc từ chối — lưu người xử lý và phản hồi (nếu có). */
export function updateStatus(user: AuthUser, id: string, { status, assigneeNote }: UpdateMaintenanceStatusInput) {
  return transition(user, id, status, { handledById: user.id, ...(assigneeNote ? { assigneeNote } : {}) });
}

/** SV xác nhận đã sửa xong — chỉ yêu cầu của chính mình, đang ở DONE. */
export function confirm(user: AuthUser, id: string) {
  return transition(user, id, 'CONFIRMED');
}

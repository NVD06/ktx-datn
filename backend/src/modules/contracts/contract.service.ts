import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ContractStatus } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { endOfDayVN } from '../../utils/date-vn.js';
import { nextDocumentCode } from '../../utils/document-code.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { studentSearch } from '../profile/profile.service.js';
import { ROOM_REF_SELECT } from '../rooms/room.service.js';
import type { CancelContractInput, ContractListQuery } from './contract.schema.js';

/*
 * Hợp đồng ở KTX (US-03.3, US-03.4). Hợp đồng DRAFT sinh ra khi duyệt đơn
 * (registration.service.ts → approve); sinh viên ký thì hợp đồng có hiệu lực.
 * Hợp đồng còn chờ ký có thể bị hủy: SV từ chối ký, hoặc Manager hủy để trả giường.
 *
 * Phạm vi: sinh viên chỉ thấy hợp đồng của mình; Manager thấy hợp đồng có
 * giường thuộc tòa mình (lồng scope qua bed → room); Admin thấy tất cả.
 */

/**
 * Hạn thanh toán hóa đơn tiền phòng: hết ngày thứ 14 (giờ VN) kể từ ngày ký
 * (us-04.md, US-04.1). Ký 25/09 lúc 10:23 thì hạn là 23:59 ngày 09/10.
 */
const ROOM_FEE_DUE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const INCLUDE = {
  bed: { select: { id: true, code: true, room: { select: ROOM_REF_SELECT } } },
  registration: {
    select: {
      period: { select: { id: true, name: true, term: true } },
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profile: { select: { studentCode: true, gender: true, className: true, faculty: true } },
        },
      },
    },
  },
  endedBy: { select: { id: true, fullName: true, role: true } },
  invoices: {
    select: { id: true, code: true, type: true, period: true, amount: true, dueDate: true, status: true },
    orderBy: { createdAt: 'asc' },
  },
} as const satisfies Prisma.ContractInclude;

type ContractRow = Prisma.ContractGetPayload<{ include: typeof INCLUDE }>;

/**
 * EXPIRED không lưu trong DB mà tính khi đọc (us-03.md, US-03.4): hợp đồng chưa
 * chấm dứt mà đã qua ngày kết thúc. Tính cả DRAFT — sinh viên không ký kịp thì
 * hợp đồng cũng hết hạn, không ký được nữa.
 */
function effectiveStatus({ status, endDate }: { status: ContractStatus; endDate: Date }) {
  return (status === 'DRAFT' || status === 'ACTIVE') && endDate < new Date() ? 'EXPIRED' : status;
}

function toDto({ registration, ...contract }: ContractRow) {
  return {
    ...contract,
    status: effectiveStatus(contract),
    period: registration.period,
    student: registration.student,
  };
}

function contractScope(user: AuthUser): Prisma.ContractWhereInput {
  if (user.role === 'STUDENT') return { registration: { studentId: user.id } };
  return { bed: { room: buildingScope(user) } };
}

/** Hợp đồng của sinh viên đang đăng nhập, mới nhất trước — mỗi kỳ một hợp đồng nên không phân trang. */
export async function listMine(user: AuthUser) {
  const rows = await prisma.contract.findMany({
    where: contractScope(user),
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
  return rows.map(toDto);
}

export async function getById(user: AuthUser, id: string) {
  const row = await prisma.contract.findFirst({
    where: { AND: [{ id }, contractScope(user)] },
    include: INCLUDE,
  });
  if (!row) throw outOfScope(user, 'Không tìm thấy hợp đồng');
  return toDto(row);
}

/**
 * Điều kiện `where` theo trạng thái THỰC TẾ. EXPIRED không lưu DB nên phải dịch
 * ra ngày: lọc "Đang hiệu lực" không được lẫn hợp đồng ACTIVE đã quá ngày kết thúc.
 */
function statusWhere(status: ContractStatus, now: Date): Prisma.ContractWhereInput {
  switch (status) {
    case 'DRAFT':
    case 'ACTIVE':
      return { status, endDate: { gte: now } };
    case 'EXPIRED':
      return { status: { in: ['DRAFT', 'ACTIVE'] }, endDate: { lt: now } };
    default:
      return { status };
  }
}

/** Bảng hợp đồng cho ADMIN/MANAGER (US-03.4) — Manager chỉ thấy hợp đồng có giường thuộc tòa mình. */
export async function list(user: AuthUser, query: ContractListQuery) {
  const where: Prisma.ContractWhereInput = {
    AND: [
      contractScope(user),
      query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { registration: { student: studentSearch(query.search) } },
            ],
          }
        : {},
      query.status ? statusWhere(query.status, new Date()) : {},
      query.periodId ? { registration: { periodId: query.periodId } } : {},
    ],
  };

  const result = await paginate(
    query,
    { sortable: ['createdAt', 'code', 'endDate'], defaultSort: { field: 'createdAt', order: 'desc' } },
    (page) => prisma.contract.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.contract.count({ where }),
  );
  return { data: result.data.map(toDto), meta: result.meta };
}

const STATUS_TEXT: Record<Exclude<ContractStatus, 'DRAFT'>, string> = {
  ACTIVE: 'đang có hiệu lực',
  EXPIRED: 'đã hết hạn',
  TERMINATED: 'đã bị chấm dứt',
  CANCELLED: 'đã bị hủy',
};

/**
 * Hợp đồng không còn chờ ký. Vừa đọc thấy DRAFT mà ghi không được nghĩa là bên
 * kia (SV ký / Manager hủy) vừa xử lý xong trong lúc mình đang thao tác.
 */
function notDraftError(status: ContractStatus, action: 'ký' | 'hủy') {
  return ApiError.conflict(
    'CONTRACT_NOT_DRAFT',
    status === 'DRAFT'
      ? 'Hợp đồng vừa được ký hoặc hủy ở nơi khác. Hãy tải lại trang.'
      : `Hợp đồng ${STATUS_TEXT[status]} nên không thể ${action}.`,
  );
}

/**
 * Sinh viên ký hợp đồng — một transaction: hợp đồng DRAFT → ACTIVE, giường →
 * OCCUPIED, sinh hóa đơn tiền phòng (US-04.1) kèm một dòng chi tiết. Hỏng bước
 * nào thì không bước nào được ghi.
 */
export async function sign(user: AuthUser, id: string) {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { AND: [{ id }, contractScope(user)] },
      select: {
        status: true,
        endDate: true,
        price: true,
        bedId: true,
        bed: { select: { code: true, room: { select: { code: true } } } },
        registration: { select: { period: { select: { term: true } } } },
      },
    });
    if (!contract) throw outOfScope(user, 'Không tìm thấy hợp đồng');
    if (contract.status !== 'DRAFT') throw notDraftError(contract.status, 'ký');

    const now = new Date();
    if (contract.endDate < now) {
      throw ApiError.conflict(
        'CONTRACT_EXPIRED',
        'Hợp đồng đã quá thời gian ở nên không thể ký. Hãy liên hệ ban quản lý.',
      );
    }

    // Điều kiện DRAFT nằm ngay trong lệnh ghi: bấm "Ký" ở hai tab thì lệnh sau
    // chờ khóa dòng rồi nhận count = 0, không ký hai lần, không sinh hai hóa đơn.
    const claimed = await tx.contract.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'ACTIVE', signedAt: now },
    });
    if (claimed.count === 0) throw notDraftError('DRAFT', 'ký');

    // Suốt thời gian chờ ký giường vẫn AVAILABLE (hợp đồng DRAFT chỉ giữ chỗ), nên
    // Manager có thể đã chuyển nó sang bảo trì. Đổi trạng thái có điều kiện để
    // không ghi đè lên thay đổi đó.
    const bed = await tx.bed.updateMany({
      where: { id: contract.bedId, status: 'AVAILABLE' },
      data: { status: 'OCCUPIED' },
    });
    if (bed.count === 0) {
      throw ApiError.conflict(
        'BED_UNAVAILABLE',
        `Giường ${contract.bed.code} phòng ${contract.bed.room.code} đang bảo trì nên chưa ký được. ` +
          'Hãy liên hệ ban quản lý để được đổi giường.',
      );
    }

    await tx.invoice.create({
      data: {
        code: await nextDocumentCode(tx, 'INV'),
        contractId: id,
        type: 'ROOM_FEE',
        // Bắt buộc có giá trị: @@unique([contractId, type, period]) chặn sinh trùng hóa đơn.
        period: contract.registration.period.term,
        amount: contract.price,
        dueDate: endOfDayVN(new Date(now.getTime() + ROOM_FEE_DUE_DAYS * DAY_MS)),
        items: {
          create: { type: 'ROOM_FEE', quantity: 1, unitPrice: contract.price, amount: contract.price },
        },
      },
    });
  });

  return getById(user, id);
}

/**
 * Hủy hợp đồng còn chờ ký — kể cả đã quá ngày kết thúc mà chưa ký, đó chính là
 * hợp đồng đang giữ giường vô ích. Giường không phải đổi trạng thái (suốt lúc
 * chờ ký nó vẫn AVAILABLE): hợp đồng thôi là DRAFT thì FREE_BED tính giường là
 * trống lại. Đơn đăng ký chuyển CANCELLED để sinh viên nộp lại được trong đợt
 * nếu đổi ý (đơn APPROVED sẽ chặn nộp lại).
 */
async function cancelDraft(user: AuthUser, id: string, reason: string, registrationNote?: string) {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { AND: [{ id }, contractScope(user)] },
      select: { status: true, registrationId: true },
    });
    if (!contract) throw outOfScope(user, 'Không tìm thấy hợp đồng');
    if (contract.status !== 'DRAFT') throw notDraftError(contract.status, 'hủy');

    // Điều kiện DRAFT nằm ngay trong lệnh ghi: SV bấm ký đúng lúc Manager bấm hủy
    // thì chỉ một bên thắng, bên kia nhận count = 0.
    const { count } = await tx.contract.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'CANCELLED', terminatedAt: new Date(), terminationReason: reason, endedById: user.id },
    });
    if (count === 0) throw notDraftError('DRAFT', 'hủy');

    await tx.registration.update({
      where: { id: contract.registrationId },
      data: { status: 'CANCELLED', ...(registrationNote ? { reviewNote: registrationNote } : {}) },
    });
  });

  return getById(user, id);
}

/** Sinh viên từ chối ký — tự báo đổi ý để giường được trả lại ngay cho người khác. */
export function decline(user: AuthUser, id: string, { reason }: CancelContractInput) {
  return cancelDraft(user, id, reason);
}

/**
 * Manager hủy hợp đồng chờ ký (SV không ký, không liên lạc được…). Lý do ghi cả
 * vào đơn đăng ký để SV đọc được ở "Đơn của tôi".
 */
export function cancel(user: AuthUser, id: string, { reason }: CancelContractInput) {
  return cancelDraft(user, id, reason, reason);
}

import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ContractStatus } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { endOfDayVN, formatDateVN } from '../../utils/date-vn.js';
import { nextDocumentCode } from '../../utils/document-code.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { compareBedCode } from '../beds/bed-code.js';
import { studentSearch } from '../profile/profile.service.js';
import { HOLDING_CONTRACT_STATUSES } from '../rooms/room-eligibility.js';
import { invoiceDueDate } from '../invoices/invoice-rules.js';
import { ROOM_REF_SELECT } from '../rooms/room.service.js';
import type { ContractListQuery, ContractReasonInput, ExtendContractInput } from './contract.schema.js';

/*
 * Hợp đồng ở KTX (US-03.3, US-03.4). Hợp đồng DRAFT sinh ra khi duyệt đơn
 * (registration.service.ts → approve); sinh viên ký thì hợp đồng có hiệu lực.
 * Hợp đồng còn chờ ký có thể bị hủy (SV từ chối ký / Manager hủy); hợp đồng đang ở
 * thì Manager gia hạn hoặc chấm dứt.
 *
 * Phạm vi: sinh viên chỉ thấy hợp đồng của mình; Manager thấy hợp đồng có
 * giường thuộc tòa mình (lồng scope qua bed → room); Admin thấy tất cả.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tiền gia hạn (chốt 25/09, phương án B): tính theo số ngày ở thêm, đơn giá ngày
 * = giá kỳ ÷ số ngày của kỳ (thời gian ở của đợt), làm tròn đồng. Ví dụ kỳ
 * 1.500.000 đ / 153 ngày = 9.804 đ/ngày; gia hạn 28 ngày = 274.512 đ.
 * Giữ khớp với extensionFee() ở frontend/src/features/contracts/contract-actions.ts.
 */
function extensionFee(price: number, term: { stayStartAt: Date; stayEndAt: Date }, from: Date, to: Date) {
  const termDays = Math.max(1, Math.round((term.stayEndAt.getTime() - term.stayStartAt.getTime()) / DAY_MS));
  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const dailyRate = Math.round(price / termDays);
  return { days, dailyRate, amount: days * dailyRate };
}

/** Giường và sinh viên của hợp đồng — hóa đơn (invoice.service.ts) trả kèm đúng dạng này. */
export const CONTRACT_BED_SELECT = { id: true, code: true, room: { select: ROOM_REF_SELECT } } as const;
export const CONTRACT_STUDENT_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  profile: { select: { studentCode: true, gender: true, className: true, faculty: true } },
} as const;

const INCLUDE = {
  bed: { select: CONTRACT_BED_SELECT },
  registration: {
    select: {
      period: { select: { id: true, name: true, term: true, stayStartAt: true, stayEndAt: true } },
      student: { select: CONTRACT_STUDENT_SELECT },
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

export function contractScope(user: AuthUser): Prisma.ContractWhereInput {
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

/**
 * Chỗ ở hiện tại của sinh viên (US-03.5): hợp đồng ACTIVE đã bắt đầu — kể cả đã
 * quá ngày kết thúc mà chưa trả phòng, SV vẫn đang ở đó. Chưa có thì lấy hợp đồng
 * ACTIVE sắp bắt đầu gần nhất (đã ký cho kỳ sau). Không có gì thì `null`.
 * Bạn cùng phòng: hợp đồng ACTIVE khác trong cùng phòng, trùng thời gian ở.
 */
export async function currentStay(user: AuthUser) {
  const now = new Date();
  const mine = { AND: [contractScope(user), { status: 'ACTIVE' as const }] };
  const row =
    (await prisma.contract.findFirst({
      where: { AND: [mine, { startDate: { lte: now } }] },
      orderBy: { startDate: 'desc' },
      include: INCLUDE,
    })) ??
    (await prisma.contract.findFirst({
      where: { AND: [mine, { startDate: { gt: now } }] },
      orderBy: { startDate: 'asc' },
      include: INCLUDE,
    }));
  if (!row) return null;

  const roommates = await prisma.contract.findMany({
    where: {
      id: { not: row.id },
      status: 'ACTIVE',
      bed: { roomId: row.bed.room.id },
      startDate: { lte: row.endDate },
      endDate: { gte: row.startDate },
    },
    // Chỉ tên, lớp, giường — không lộ thông tin liên lạc của người khác cho sinh viên.
    select: {
      bed: { select: { code: true } },
      registration: { select: { student: { select: { fullName: true, profile: { select: { className: true } } } } } },
    },
  });

  return {
    contract: toDto(row),
    roommates: roommates
      .map(({ bed, registration: { student } }) => ({
        fullName: student.fullName,
        className: student.profile?.className ?? null,
        bedCode: bed.code,
      }))
      .sort((a, b) => compareBedCode({ code: a.bedCode }, { code: b.bedCode })),
  };
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

const STATUS_TEXT: Record<ContractStatus, string> = {
  DRAFT: 'còn chờ ký',
  ACTIVE: 'đang có hiệu lực',
  EXPIRED: 'đã hết hạn',
  TERMINATED: 'đã bị chấm dứt',
  CANCELLED: 'đã bị hủy',
};

/**
 * Hợp đồng không ở trạng thái thao tác cần: DRAFT để ký/hủy, ACTIVE để gia hạn/chấm
 * dứt. `status = null`: vừa đọc thấy đúng trạng thái mà ghi không được — người khác
 * vừa xử lý xong trong lúc mình đang thao tác.
 */
function wrongStatusError(expected: 'DRAFT' | 'ACTIVE', status: ContractStatus | null, action: string) {
  return ApiError.conflict(
    `CONTRACT_NOT_${expected}`,
    status
      ? `Hợp đồng ${STATUS_TEXT[status]} nên không thể ${action}.`
      : 'Hợp đồng vừa được thay đổi ở nơi khác. Hãy tải lại trang.',
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
    if (contract.status !== 'DRAFT') throw wrongStatusError('DRAFT', contract.status, 'ký');

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
    if (claimed.count === 0) throw wrongStatusError('DRAFT', null, 'ký');

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
        dueDate: invoiceDueDate(now),
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
    if (contract.status !== 'DRAFT') throw wrongStatusError('DRAFT', contract.status, 'hủy');

    // Điều kiện DRAFT nằm ngay trong lệnh ghi: SV bấm ký đúng lúc Manager bấm hủy
    // thì chỉ một bên thắng, bên kia nhận count = 0.
    const { count } = await tx.contract.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'CANCELLED', terminatedAt: new Date(), terminationReason: reason, endedById: user.id },
    });
    if (count === 0) throw wrongStatusError('DRAFT', null, 'hủy');

    await tx.registration.update({
      where: { id: contract.registrationId },
      data: { status: 'CANCELLED', ...(registrationNote ? { reviewNote: registrationNote } : {}) },
    });
  });

  return getById(user, id);
}

/** Sinh viên từ chối ký — tự báo đổi ý để giường được trả lại ngay cho người khác. */
export function decline(user: AuthUser, id: string, { reason }: ContractReasonInput) {
  return cancelDraft(user, id, reason);
}

/**
 * Manager hủy hợp đồng chờ ký (SV không ký, không liên lạc được…). Lý do ghi cả
 * vào đơn đăng ký để SV đọc được ở "Đơn của tôi".
 */
export function cancel(user: AuthUser, id: string, { reason }: ContractReasonInput) {
  return cancelDraft(user, id, reason, reason);
}

/**
 * Gia hạn hợp đồng đang ở (US-03.4): giữ nguyên giường, lùi ngày kết thúc và lập
 * hóa đơn tiền phòng cho số ngày ở thêm — 1 dòng "số ngày × đơn giá ngày". Mỗi lần
 * gia hạn một hóa đơn, kỳ ghi theo ngày kết thúc mới cho khỏi trùng @@unique.
 * Gia hạn được cả hợp đồng đã quá ngày kết thúc mà SV vẫn ở: số ngày tính từ ngày
 * kết thúc cũ nên không sót những ngày đã ở quá hạn.
 */
export async function extend(user: AuthUser, id: string, input: ExtendContractInput) {
  const endDate = endOfDayVN(input.endDate);

  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { AND: [{ id }, contractScope(user)] },
      select: {
        status: true,
        endDate: true,
        price: true,
        registration: {
          select: { studentId: true, period: { select: { term: true, stayStartAt: true, stayEndAt: true } } },
        },
      },
    });
    if (!contract) throw outOfScope(user, 'Không tìm thấy hợp đồng');
    if (contract.status !== 'ACTIVE') throw wrongStatusError('ACTIVE', contract.status, 'gia hạn');

    const now = new Date();
    if (endDate <= contract.endDate) {
      throw ApiError.validation({
        endDate: [`Ngày kết thúc mới phải sau ngày kết thúc hiện tại (${formatDateVN(contract.endDate)})`],
      });
    }
    if (endDate < now) throw ApiError.validation({ endDate: ['Ngày kết thúc mới không được trước hôm nay'] });

    // Phần ở thêm không được đè lên hợp đồng kỳ sau của chính SV (đã duyệt hoặc đang ở).
    const { studentId, period } = contract.registration;
    const next = await tx.contract.findFirst({
      where: {
        id: { not: id },
        status: { in: [...HOLDING_CONTRACT_STATUSES] },
        registration: { studentId },
        startDate: { lte: endDate },
        endDate: { gt: contract.endDate },
      },
      select: { code: true, startDate: true },
    });
    if (next) {
      throw ApiError.conflict(
        'CONTRACT_OVERLAP',
        `Sinh viên đã có hợp đồng ${next.code} từ ${formatDateVN(next.startDate)}, chỉ gia hạn được đến trước ngày đó.`,
      );
    }

    // Ngày kết thúc cũ nằm trong điều kiện ghi: hai người cùng gia hạn một lúc thì
    // người sau nhận count = 0 thay vì tính tiền chồng lên nhau.
    const { count } = await tx.contract.updateMany({
      where: { id, status: 'ACTIVE', endDate: contract.endDate },
      data: { endDate },
    });
    if (count === 0) throw wrongStatusError('ACTIVE', null, 'gia hạn');

    const fee = extensionFee(Number(contract.price), period, contract.endDate, endDate);
    await tx.invoice.create({
      data: {
        code: await nextDocumentCode(tx, 'INV'),
        contractId: id,
        type: 'ROOM_FEE',
        // "2026-HK1-GH-20270228" — năm/tháng/ngày của ngày kết thúc mới (giờ VN).
        period: `${period.term}-GH-${formatDateVN(endDate).split('/').reverse().join('')}`,
        amount: fee.amount,
        dueDate: invoiceDueDate(now),
        items: {
          create: { type: 'ROOM_FEE', quantity: fee.days, unitPrice: fee.dailyRate, amount: fee.amount },
        },
      },
    });
  });

  return getById(user, id);
}

/**
 * Chấm dứt hợp đồng đang ở (US-03.4), gồm cả trả phòng khi đã quá ngày kết thúc:
 * EXPIRED chỉ tính khi đọc, giường vẫn OCCUPIED cho tới khi chấm dứt. Hóa đơn chưa
 * thanh toán giữ nguyên để thu sau (FE cảnh báo trước); không hoàn tiền tự động.
 */
export async function terminate(user: AuthUser, id: string, { reason }: ContractReasonInput) {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { AND: [{ id }, contractScope(user)] },
      select: { status: true, bedId: true },
    });
    if (!contract) throw outOfScope(user, 'Không tìm thấy hợp đồng');
    if (contract.status !== 'ACTIVE') throw wrongStatusError('ACTIVE', contract.status, 'chấm dứt');

    const { count } = await tx.contract.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'TERMINATED', terminatedAt: new Date(), terminationReason: reason, endedById: user.id },
    });
    if (count === 0) throw wrongStatusError('ACTIVE', null, 'chấm dứt');

    await tx.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } });
  });

  return getById(user, id);
}

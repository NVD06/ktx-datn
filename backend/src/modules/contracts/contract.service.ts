import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ContractStatus } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { endOfDayVN } from '../../utils/date-vn.js';
import { nextDocumentCode } from '../../utils/document-code.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { BUILDING_REF_SELECT, ROOM_TYPE_SELECT } from '../rooms/room.service.js';

/*
 * Hợp đồng ở KTX (US-03.3). Hợp đồng DRAFT sinh ra khi duyệt đơn
 * (registration.service.ts → approve); sinh viên ký thì hợp đồng có hiệu lực.
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
  bed: {
    select: {
      id: true,
      code: true,
      room: {
        select: {
          id: true,
          code: true,
          floor: true,
          building: { select: BUILDING_REF_SELECT },
          roomType: { select: ROOM_TYPE_SELECT },
        },
      },
    },
  },
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
export function effectiveStatus(contract: { status: ContractStatus; endDate: Date }, now = new Date()) {
  const running = contract.status === 'DRAFT' || contract.status === 'ACTIVE';
  return running && contract.endDate < now ? 'EXPIRED' : contract.status;
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
    where: { registration: { studentId: user.id } },
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
  if (!row) {
    // Sinh viên xem hợp đồng người khác cũng nhận 404 — không lộ việc id đó có tồn tại.
    throw user.role === 'STUDENT'
      ? ApiError.notFound('Không tìm thấy hợp đồng')
      : outOfScope(user, 'Không tìm thấy hợp đồng');
  }
  return toDto(row);
}

const NOT_SIGNABLE: Record<Exclude<ContractStatus, 'DRAFT'>, string> = {
  ACTIVE: 'Bạn đã ký hợp đồng này rồi.',
  EXPIRED: 'Hợp đồng đã hết hạn nên không thể ký.',
  TERMINATED: 'Hợp đồng đã bị hủy nên không thể ký.',
};

/**
 * Sinh viên ký hợp đồng — một transaction: hợp đồng DRAFT → ACTIVE, giường →
 * OCCUPIED, sinh hóa đơn tiền phòng (US-04.1) kèm một dòng chi tiết. Hỏng bước
 * nào thì không bước nào được ghi.
 */
export async function sign(user: AuthUser, id: string) {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id, registration: { studentId: user.id } },
      select: {
        status: true,
        endDate: true,
        price: true,
        bedId: true,
        bed: { select: { code: true, room: { select: { code: true } } } },
        registration: { select: { period: { select: { term: true } } } },
      },
    });
    if (!contract) throw ApiError.notFound('Không tìm thấy hợp đồng');
    if (contract.status !== 'DRAFT') {
      throw ApiError.conflict('CONTRACT_NOT_DRAFT', NOT_SIGNABLE[contract.status]);
    }

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
    if (claimed.count === 0) throw ApiError.conflict('CONTRACT_NOT_DRAFT', NOT_SIGNABLE.ACTIVE);

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

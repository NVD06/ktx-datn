import { ELECTRIC_PRICE, PAYMENT_EXPIRE_MINUTES, WATER_PRICE } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { currentMonthVN, nextMonthStartVN } from '../../utils/date-vn.js';
import { nextDocumentCodes } from '../../utils/document-code.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { findBuildingInScope } from '../rooms/room.service.js';
import { invoiceDueDate } from './invoice-rules.js';
import type { BillUtilitiesInput, CancelUtilityInput, UtilitySheetQuery } from './utility.schema.js';

/*
 * Hóa đơn điện nước (US-04.2): Manager chốt chỉ số của CẢ PHÒNG theo tháng, tiền chia
 * đều cho SV đang ở (database.md §3, quy tắc 4). Không có bảng chỉ số riêng — chỉ số
 * nằm ở InvoiceItem, nên "chỉ số lần trước" đọc lại từ hóa đơn UTILITY. Hạn chế: phòng
 * trống không lập hóa đơn nên không lưu chỉ số. Nhập sai thì hủy lần chốt của phòng
 * (`cancel`) rồi chốt lại.
 */

/**
 * Phòng kèm các SV chia tiền của kỳ — hợp đồng ACTIVE bắt đầu trước khi hết tháng, kể
 * cả quá hạn mà chưa trả phòng — và số hóa đơn UTILITY kỳ này của từng người (> 0 là
 * phòng đã chốt). Không xử lý SV chuyển vào/ra giữa tháng (payment-flow.md).
 */
function roomSelect(period: string) {
  return {
    id: true,
    code: true,
    floor: true,
    beds: {
      select: {
        contracts: {
          where: { status: 'ACTIVE', startDate: { lt: nextMonthStartVN(period) } },
          select: { id: true, _count: { select: { invoices: { where: { type: 'UTILITY', period } } } } },
        },
      },
    },
  } as const satisfies Prisma.RoomSelect;
}

/** Dòng hóa đơn của một SV: số lượng của cả phòng, chia đều ở từng dòng rồi làm tròn. */
function meterItem(type: 'ELECTRIC' | 'WATER', oldIndex: number, newIndex: number, unitPrice: number, n: number) {
  const quantity = newIndex - oldIndex;
  return { type, oldIndex, newIndex, quantity, unitPrice, amount: Math.round((quantity * unitPrice) / n) };
}

/** Bảng chốt của một tòa trong một tháng — chỉ số mới lần chốt trước điền sẵn làm chỉ số cũ. */
export async function sheet(user: AuthUser, { buildingId, period }: UtilitySheetQuery) {
  const { name } = await findBuildingInScope(user, buildingId);
  const [rooms, history, current] = await Promise.all([
    prisma.room.findMany({ where: { buildingId }, orderBy: [{ floor: 'asc' }, { code: 'asc' }], select: roomSelect(period) }),
    prisma.invoice.findMany({
      where: { type: 'UTILITY', period: { lt: period }, contract: { bed: { room: { buildingId } } } },
      orderBy: { period: 'desc' },
      select: { contract: { select: { bed: { select: { roomId: true } } } }, items: { select: { type: true, newIndex: true } } },
    }),
    prisma.invoice.findMany({
      where: { type: 'UTILITY', period: { gte: period }, contract: { bed: { room: { buildingId } } } },
      select: { period: true, status: true, contract: { select: { bed: { select: { roomId: true } } } } },
    }),
  ]);

  // Mới nhất trước nên hóa đơn gặp đầu tiên của mỗi phòng là lần chốt gần nhất.
  const last = new Map<string, (typeof history)[number]['items']>();
  for (const { contract, items } of history) if (!last.has(contract.bed.roomId)) last.set(contract.bed.roomId, items);
  const newIndex = (roomId: string, type: 'ELECTRIC' | 'WATER') => last.get(roomId)?.find((i) => i.type === type)?.newIndex;

  // Lần chốt kỳ này có hủy được không — chỉ để giao diện ẩn nút Hủy, `cancel` vẫn tự kiểm tra lại.
  const roomsOf = (rows: typeof current) => new Set(rows.map((i) => i.contract.bed.roomId));
  const paid = roomsOf(current.filter((i) => i.period === period && i.status === 'PAID'));
  const later = roomsOf(current.filter((i) => i.period > period));

  return {
    building: { id: buildingId, name },
    period,
    prices: { electric: ELECTRIC_PRICE, water: WATER_PRICE },
    rooms: rooms.map(({ beds, ...room }) => {
      const contracts = beds.flatMap((b) => b.contracts);
      return {
        ...room,
        residents: contracts.length,
        billed: contracts.some((c) => c._count.invoices > 0),
        prefill: last.has(room.id) ? { electricOld: newIndex(room.id, 'ELECTRIC'), waterOld: newIndex(room.id, 'WATER') } : null,
        cancelBlock: paid.has(room.id) ? ('PAID' as const) : later.has(room.id) ? ('LATER_BILLED' as const) : null,
      };
    }),
  };
}

/**
 * Chốt chỉ số, lập hóa đơn UTILITY trong một transaction: mỗi SV đang ở một hóa đơn,
 * 2 dòng ELECTRIC + WATER, đơn giá chép vào dòng (snapshot). Phòng đã chốt, phòng
 * trống, phòng không dùng gì thì bỏ qua và báo lại. Hai người cùng chốt một phòng thì
 * unique (contractId, type, period) chặn người sau — error-handler trả 409.
 */
export async function bill(user: AuthUser, { buildingId, period, readings }: BillUtilitiesInput) {
  await findBuildingInScope(user, buildingId);
  if (period > currentMonthVN()) throw ApiError.validation({ period: ['Chưa tới tháng này nên chưa chốt được'] });

  return prisma.$transaction(async (tx) => {
    const found = await tx.room.findMany({
      where: { buildingId, id: { in: readings.map((r) => r.roomId) } },
      select: roomSelect(period),
    });
    const rooms = new Map(found.map((room) => [room.id, room]));
    const unknown = readings.findIndex((r) => !rooms.has(r.roomId));
    if (unknown >= 0) throw ApiError.validation({ [`readings.${unknown}.roomId`]: ['Phòng không thuộc tòa này'] });

    const skipped: { code: string; reason: 'BILLED' | 'EMPTY' | 'NO_USAGE' }[] = [];
    const rows: { contractId: string; splitCount: number; items: ReturnType<typeof meterItem>[] }[] = [];
    for (const r of readings) {
      const room = rooms.get(r.roomId)!;
      const contracts = room.beds.flatMap((b) => b.contracts);
      const n = contracts.length;
      const items =
        n > 0
          ? [
              meterItem('ELECTRIC', r.electricOld, r.electricNew, ELECTRIC_PRICE, n),
              meterItem('WATER', r.waterOld, r.waterNew, WATER_PRICE, n),
            ]
          : [];
      // Không dùng gì thì không lập hóa đơn 0 đồng bắt SV "thanh toán".
      const reason = contracts.some((c) => c._count.invoices > 0)
        ? 'BILLED'
        : n === 0
          ? 'EMPTY'
          : items.every((i) => i.amount === 0)
            ? 'NO_USAGE'
            : null;
      if (reason) skipped.push({ code: room.code, reason });
      else rows.push(...contracts.map((c) => ({ contractId: c.id, splitCount: n, items })));
    }

    if (rows.length > 0) {
      const codes = await nextDocumentCodes(tx, 'INV', rows.length);
      const dueDate = invoiceDueDate(new Date());
      const created = await tx.invoice.createManyAndReturn({
        data: rows.map(({ items, ...row }, i) => ({
          ...row,
          code: codes[i]!,
          type: 'UTILITY' as const,
          period,
          dueDate,
          amount: items.reduce((sum, item) => sum + item.amount, 0),
        })),
        select: { id: true, contractId: true },
      });
      // Một hóa đơn / hợp đồng / kỳ nên contractId đủ để ghép dòng chi tiết.
      const itemsOf = new Map(rows.map((row) => [row.contractId, row.items]));
      await tx.invoiceItem.createMany({
        data: created.flatMap(({ id, contractId }) => itemsOf.get(contractId)!.map((item) => ({ ...item, invoiceId: id }))),
      });
    }

    return { invoiceCount: rows.length, roomCount: readings.length - skipped.length, skipped };
  });
}

/** Giao dịch VNPay tạo trong khoảng này có thể vẫn đang thành công — thêm 5 phút chờ IPN tới chậm. */
const PAYMENT_OPEN_MS = (PAYMENT_EXPIRE_MINUTES + 5) * 60 * 1000;

/**
 * Hủy lần chốt điện nước của một phòng trong một tháng — khi Manager nhập sai chỉ số.
 * Hủy cả phòng chứ không từng SV: mọi hóa đơn của phòng chung một chỉ số.
 *
 * Xóa hẳn hóa đơn (dòng chi tiết xóa theo), vì giữ lại thì unique (contractId, type, period)
 * chặn lần chốt lại. Chỉ hủy khi:
 * - chưa SV nào của phòng thanh toán — hệ thống không có luồng hoàn tiền;
 * - không SV nào đang ở cổng VNPay — xóa hóa đơn rồi mà VNPay vẫn trừ tiền thì mất dấu khoản đó;
 * - chưa chốt tháng sau — tháng sau lấy chỉ số mới của tháng này làm chỉ số cũ, phải hủy tháng sau trước.
 * Trả lại chỉ số đã nhập để giao diện điền lại, Manager chỉ sửa ô sai rồi chốt lại.
 */
export async function cancel(user: AuthUser, { roomId, period }: CancelUtilityInput) {
  const room = await prisma.room.findFirst({ where: { id: roomId, ...buildingScope(user) }, select: { code: true } });
  if (!room) throw outOfScope(user, 'Không tìm thấy phòng');
  const ofRoom = { type: 'UTILITY', contract: { bed: { roomId } } } as const satisfies Prisma.InvoiceWhereInput;

  return prisma.$transaction(async (tx) => {
    const openSince = new Date(Date.now() - PAYMENT_OPEN_MS);
    const openPayment = { status: 'PENDING', createdAt: { gt: openSince } } as const satisfies Prisma.PaymentWhereInput;
    const invoices = await tx.invoice.findMany({
      where: { ...ofRoom, period },
      select: {
        id: true,
        status: true,
        items: { select: { type: true, oldIndex: true, newIndex: true } },
        _count: { select: { payments: { where: openPayment } } },
      },
    });
    if (invoices.length === 0) throw ApiError.notFound(`Phòng ${room.code} chưa chốt điện nước tháng ${period}`);
    if (invoices.some((i) => i.status === 'PAID')) {
      const message = `Phòng ${room.code} đã có sinh viên thanh toán tiền điện nước tháng ${period}, không hủy được`;
      throw ApiError.conflict('UTILITY_PAID', message);
    }
    if (invoices.some((i) => i._count.payments > 0)) {
      const message = `Có sinh viên phòng ${room.code} đang thanh toán qua VNPay, hãy thử lại sau ít phút`;
      throw ApiError.conflict('PAYMENT_IN_PROGRESS', message);
    }
    const later = await tx.invoice.findFirst({
      where: { ...ofRoom, period: { gt: period } },
      orderBy: { period: 'desc' },
      select: { period: true },
    });
    if (later) {
      const message = `Phòng ${room.code} đã chốt tới tháng ${later.period}, hãy hủy từ tháng đó trở về trước`;
      throw ApiError.conflict('LATER_PERIOD_BILLED', message);
    }

    const ids = invoices.map((i) => i.id);
    // Còn lại chỉ là giao dịch thất bại hoặc đã hết hạn — không có tiền đi kèm, xóa theo hóa đơn. Giao dịch
    // SV vừa tạo sau bước kiểm tra thì giữ nguyên: khóa ngoại chặn xóa hóa đơn, cả transaction hủy (409).
    await tx.payment.deleteMany({ where: { invoiceId: { in: ids }, NOT: openPayment } });
    // IPN ghi PAID ngay sau bước kiểm tra thì xóa thiếu — hủy cả transaction thay vì xóa một nửa phòng.
    const { count } = await tx.invoice.deleteMany({ where: { id: { in: ids }, status: 'UNPAID' } });
    if (count !== ids.length) {
      throw ApiError.conflict('UTILITY_PAID', `Phòng ${room.code} vừa có sinh viên thanh toán, không hủy được`);
    }

    // Mọi hóa đơn của phòng chung một chỉ số, đọc ở hóa đơn đầu là đủ.
    const index = (type: 'ELECTRIC' | 'WATER') => invoices[0]!.items.find((i) => i.type === type)!;
    const [electric, water] = [index('ELECTRIC'), index('WATER')];
    return {
      invoiceCount: count,
      reading: {
        electricOld: electric.oldIndex!,
        electricNew: electric.newIndex!,
        waterOld: water.oldIndex!,
        waterNew: water.newIndex!,
      },
    };
  });
}

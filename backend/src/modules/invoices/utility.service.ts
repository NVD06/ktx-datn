import { ELECTRIC_PRICE, WATER_PRICE } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { currentMonthVN, nextMonthStartVN } from '../../utils/date-vn.js';
import { nextDocumentCodes } from '../../utils/document-code.js';
import { findBuildingInScope } from '../rooms/room.service.js';
import { invoiceDueDate } from './invoice-rules.js';
import type { BillUtilitiesInput, UtilitySheetQuery } from './utility.schema.js';

/*
 * Hóa đơn điện nước (US-04.2): Manager chốt chỉ số của CẢ PHÒNG theo tháng, tiền chia
 * đều cho SV đang ở (database.md §3, quy tắc 4). Không có bảng chỉ số riêng — chỉ số
 * nằm ở InvoiceItem, nên "chỉ số lần trước" đọc lại từ hóa đơn UTILITY. Hạn chế: phòng
 * trống không lập hóa đơn nên không lưu chỉ số.
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
  const [rooms, history] = await Promise.all([
    prisma.room.findMany({ where: { buildingId }, orderBy: [{ floor: 'asc' }, { code: 'asc' }], select: roomSelect(period) }),
    prisma.invoice.findMany({
      where: { type: 'UTILITY', period: { lt: period }, contract: { bed: { room: { buildingId } } } },
      orderBy: { period: 'desc' },
      select: { contract: { select: { bed: { select: { roomId: true } } } }, items: { select: { type: true, newIndex: true } } },
    }),
  ]);

  // Mới nhất trước nên hóa đơn gặp đầu tiên của mỗi phòng là lần chốt gần nhất.
  const last = new Map<string, (typeof history)[number]['items']>();
  for (const { contract, items } of history) if (!last.has(contract.bed.roomId)) last.set(contract.bed.roomId, items);
  const newIndex = (roomId: string, type: 'ELECTRIC' | 'WATER') => last.get(roomId)?.find((i) => i.type === type)?.newIndex;

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

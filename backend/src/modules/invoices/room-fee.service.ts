import { HALF_MONTH_DAYS } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { calendarDaysVN, currentMonthVN, monthStartVN, nextMonthStartVN, shiftMonth } from '../../utils/date-vn.js';
import { nextDocumentCodes } from '../../utils/document-code.js';
import { invoiceDueDate } from './invoice-rules.js';

/*
 * Hóa đơn tiền phòng hằng tháng — trả sau, giống điện nước: đầu tháng sau hệ thống tự lập
 * hóa đơn cho tháng vừa ở, giá tháng của hợp đồng (chép từ loại phòng lúc duyệt). Tháng ở
 * không trọn theo quy tắc nửa tháng. Không có nút lập tay: server gọi `billPendingMonths`
 * lúc khởi động và mỗi giờ (`startRoomFeeBilling`), chạy lại bao nhiêu lần cũng không trùng.
 */

/**
 * Hợp đồng ký trước khi đổi sang tính theo tháng đã có hóa đơn cả kỳ ("2026-HK1") hoặc gia
 * hạn ("2026-HK1-GH-…") — không lập thêm hóa đơn tháng, nếu không SV bị tính tiền hai lần.
 */
const TERM_INVOICE = { type: 'ROOM_FEE', period: { contains: '-HK' } } as const satisfies Prisma.InvoiceWhereInput;

/** Server tắt hoặc ngủ qua đầu tháng thì lần chạy sau vẫn bù được — xét thêm vài tháng trước. */
const LOOKBACK_MONTHS = 3;
const HOUR_MS = 60 * 60 * 1000;

type StayDates = { startDate: Date; endDate: Date; signedAt: Date | null; terminatedAt: Date | null };

/**
 * Số ngày SV ở trong tháng `period`: từ ngày ký (giường có người từ lúc ký; ký trước ngày bắt đầu
 * thì tính từ ngày bắt đầu) tới ngày kết thúc hợp đồng hoặc ngày chấm dứt, tính cả hai đầu.
 * Ở quá ngày kết thúc mà chưa gia hạn thì không tính — gia hạn xong, lần chạy sau lập bù tháng đó.
 */
export function stayDaysInMonth({ startDate, endDate, signedAt, terminatedAt }: StayDates, period: string) {
  if (!signedAt) return 0;
  const from = Math.max(startDate.getTime(), signedAt.getTime(), monthStartVN(period).getTime());
  const to = Math.min(endDate.getTime(), terminatedAt?.getTime() ?? Infinity, nextMonthStartVN(period).getTime() - 1);
  return to < from ? 0 : calendarDaysVN(new Date(from), new Date(to));
}

/** Số tháng tính tiền: không ở ngày nào 0, dưới HALF_MONTH_DAYS ngày nửa tháng, còn lại cả tháng. */
export function roomFeeQuantity(days: number) {
  if (days <= 0) return 0;
  return days < HALF_MONTH_DAYS ? 0.5 : 1;
}

/**
 * Lập hóa đơn tiền phòng tháng `period` (đã kết thúc) cho mọi hợp đồng có ở trong tháng mà chưa
 * có hóa đơn tháng đó. Mỗi hóa đơn một dòng ROOM_FEE: số lượng 1 hoặc 0,5 tháng × giá tháng.
 * Trả số hóa đơn đã lập.
 */
export async function billMonth(period: string) {
  const monthStart = monthStartVN(period);
  const monthEnd = nextMonthStartVN(period);
  if (monthEnd > new Date()) throw new Error(`Tháng ${period} chưa kết thúc, chưa lập hóa đơn tiền phòng được`);

  return prisma.$transaction(async (tx) => {
    // Khởi động đúng lúc tới giờ hẹn thì hai lần chạy chồng nhau: lần sau chờ lần trước xong rồi mới đọc.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('room-fee-billing'))`;

    const contracts = await tx.contract.findMany({
      where: {
        // Hợp đồng đã ký: đang ở, hoặc đã chấm dứt (tháng cuối vẫn phải trả).
        status: { in: ['ACTIVE', 'TERMINATED'] },
        signedAt: { lt: monthEnd },
        startDate: { lt: monthEnd },
        endDate: { gte: monthStart },
        OR: [{ terminatedAt: null }, { terminatedAt: { gte: monthStart } }],
        invoices: { none: { OR: [{ type: 'ROOM_FEE', period }, TERM_INVOICE] } },
      },
      select: { id: true, price: true, startDate: true, endDate: true, signedAt: true, terminatedAt: true },
    });

    const rows = contracts.flatMap((contract) => {
      const quantity = roomFeeQuantity(stayDaysInMonth(contract, period));
      const unitPrice = Number(contract.price);
      return quantity > 0 ? [{ contractId: contract.id, quantity, unitPrice, amount: Math.round(unitPrice * quantity) }] : [];
    });
    if (rows.length === 0) return 0;

    const codes = await nextDocumentCodes(tx, 'INV', rows.length);
    const dueDate = invoiceDueDate(new Date());
    const created = await tx.invoice.createManyAndReturn({
      data: rows.map(({ contractId, amount }, i) => ({
        code: codes[i]!,
        contractId,
        type: 'ROOM_FEE' as const,
        period,
        amount,
        dueDate,
      })),
      select: { id: true, contractId: true },
    });
    // Một hóa đơn / hợp đồng / tháng nên contractId đủ để ghép dòng chi tiết.
    const rowOf = new Map(rows.map((row) => [row.contractId, row]));
    await tx.invoiceItem.createMany({
      data: created.map(({ id, contractId }) => {
        const { quantity, unitPrice, amount } = rowOf.get(contractId)!;
        return { invoiceId: id, type: 'ROOM_FEE' as const, quantity, unitPrice, amount };
      }),
    });
    return rows.length;
  });
}

/** Lập hóa đơn cho các tháng đã kết thúc còn thiếu, cũ trước mới sau. Trả tổng số hóa đơn đã lập. */
export async function billPendingMonths() {
  const lastMonth = shiftMonth(currentMonthVN(), -1);
  let total = 0;
  for (let n = LOOKBACK_MONTHS - 1; n >= 0; n--) total += await billMonth(shiftMonth(lastMonth, -n));
  return total;
}

/**
 * Hẹn giờ ngay trong tiến trình server, không cần cron ngoài: chạy lúc khởi động (bù những lần server
 * tắt / ngủ qua đầu tháng) rồi mỗi giờ — nên hóa đơn tháng trước có trong giờ đầu tiên của ngày 1.
 * Lỗi chỉ ghi log, giờ sau thử lại.
 */
export function startRoomFeeBilling() {
  const run = () =>
    billPendingMonths()
      .then((count) => count > 0 && console.log(`Đã lập ${count} hóa đơn tiền phòng`))
      .catch((error: unknown) => console.error('[ROOM_FEE_BILLING]', error));
  void run();
  setInterval(run, HOUR_MS);
}

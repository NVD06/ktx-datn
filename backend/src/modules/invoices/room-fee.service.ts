import { HALF_MONTH_DAYS } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  calendarDaysVN,
  currentMonthVN,
  endOfDayVN,
  monthOfVN,
  monthStartVN,
  nextMonthStartVN,
  shiftMonth,
} from '../../utils/date-vn.js';
import { nextDocumentCodes } from '../../utils/document-code.js';
import { invoiceDueDate } from './invoice-rules.js';

/*
 * Hóa đơn tiền phòng hằng tháng — trả trước: tháng nào lập hóa đơn tháng đó, giá tháng của hợp
 * đồng (chép từ loại phòng lúc duyệt). Tháng đầu lập ngay lúc SV ký (`billFirstMonth`, chạy trong
 * transaction ký); các tháng sau server tự lập vào đầu tháng — gọi `billPendingMonths` lúc khởi
 * động và mỗi giờ (`startRoomFeeBilling`), chạy lại bao nhiêu lần cũng không trùng. Tháng ở không
 * trọn theo quy tắc nửa tháng, tính theo số ngày dự kiến ở trong tháng tại lúc lập.
 */

/**
 * Hợp đồng ký trước khi đổi sang tính theo tháng đã có hóa đơn cả kỳ ("2026-HK1", trả tới hết thời
 * gian ở của đợt) hoặc gia hạn ("2026-HK1-GH-20270228", trả tới hết ngày đó) — tháng lập sau chỉ tính
 * những ngày ở sau mốc đã trả, nếu không SV bị tính tiền hai lần.
 */
const LEGACY_MARK = '-HK';
const LEGACY_EXTENSION = /-GH-(\d{4})(\d{2})(\d{2})$/;
const TOP_UP = '-BS';

/** Server tắt hoặc ngủ qua đầu tháng thì lần chạy sau vẫn bù được — xét cả vài tháng trước. */
const LOOKBACK_MONTHS = 3;
const HOUR_MS = 60 * 60 * 1000;

const STAY_SELECT = {
  id: true,
  price: true,
  startDate: true,
  endDate: true,
  signedAt: true,
  terminatedAt: true,
} as const satisfies Prisma.ContractSelect;

function billSelect(period: string) {
  return {
    ...STAY_SELECT,
    registration: { select: { period: { select: { stayEndAt: true } } } },
    invoices: {
      where: { type: 'ROOM_FEE', OR: [{ period: { startsWith: period } }, { period: { contains: LEGACY_MARK } }] },
      select: { period: true, items: { select: { quantity: true } } },
    },
  } as const satisfies Prisma.ContractSelect;
}
type StayDates = { startDate: Date; endDate: Date; signedAt: Date | null; terminatedAt: Date | null };
type BillableContract = Prisma.ContractGetPayload<{ select: ReturnType<typeof billSelect> }>;
function legacyPaidUntil({ invoices, registration }: BillableContract) {
  const legacy = invoices.filter((i) => i.period.includes(LEGACY_MARK));
  if (legacy.length === 0) return 0;
  const extensions = legacy.flatMap(({ period }) => {
    const [, y, m, d] = LEGACY_EXTENSION.exec(period) ?? [];
    return y ? [endOfDayVN(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))).getTime()] : [];
  });
  return Math.max(endOfDayVN(registration.period.stayEndAt).getTime(), ...extensions);
}
function billedQuantity({ invoices }: BillableContract, period: string) {
  return invoices
    .filter((i) => i.period.startsWith(period))
    .flatMap((i) => i.items)
    .reduce((sum, item) => sum + Number(item.quantity), 0);
}

/**
 * Số ngày SV ở trong tháng `period`: từ ngày ký (giường có người từ lúc ký; ký trước ngày bắt đầu
 * thì tính từ ngày bắt đầu) tới ngày kết thúc hợp đồng hoặc ngày chấm dứt, tính cả hai đầu. Lập
 * trước nên với tháng đang ở hoặc sắp ở đây là số ngày dự kiến. Ở quá ngày kết thúc mà chưa gia hạn
 * thì không tính — gia hạn xong, lần chạy sau lập bù tháng đó. Ngày tới `paidUntil` đã trả theo hóa
 * đơn kiểu cũ nên không tính.
 */
export function stayDaysInMonth({ startDate, endDate, signedAt, terminatedAt }: StayDates, period: string, paidUntil = 0) {
  if (!signedAt) return 0;
  const from = Math.max(startDate.getTime(), signedAt.getTime(), monthStartVN(period).getTime(), paidUntil + 1);
  const to = Math.min(endDate.getTime(), terminatedAt?.getTime() ?? Infinity, nextMonthStartVN(period).getTime() - 1);
  return to < from ? 0 : calendarDaysVN(new Date(from), new Date(to));
}

/** Số tháng tính tiền: không ở ngày nào 0, dưới HALF_MONTH_DAYS ngày nửa tháng, còn lại cả tháng. */
export function roomFeeQuantity(days: number) {
  if (days <= 0) return 0;
  return days < HALF_MONTH_DAYS ? 0.5 : 1;
}

/**
 * Mọi lần lập tiền phòng (bộ hẹn giờ, lúc ký) đi lần lượt: chồng nhau thì lần sau chờ lần trước
 * commit rồi mới đọc, nên không lập trùng hóa đơn cùng hợp đồng cùng tháng.
 */
function lockBilling(tx: Prisma.TransactionClient) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('room-fee-billing'))`;
}

/**
 * Lập hóa đơn tháng `period` cho các hợp đồng: số tháng phải trả (1 hoặc 0,5) trừ số tháng đã lập
 * của tháng đó. Chưa lập gì thì hóa đơn kỳ `period`; đã lập nửa tháng mà nay phải trả cả tháng (vừa
 * gia hạn) thì hóa đơn bổ sung kỳ `period-BS` cho nửa còn lại. Mỗi hóa đơn một dòng ROOM_FEE: số
 * lượng × giá tháng. Trả số hóa đơn đã lập.
 */
async function createRoomFees(tx: Prisma.TransactionClient, contracts: BillableContract[], period: string) {
  const rows = contracts.flatMap((contract) => {
    const billed = billedQuantity(contract, period);
    const quantity = roomFeeQuantity(stayDaysInMonth(contract, period, legacyPaidUntil(contract))) - billed;
    const unitPrice = Number(contract.price);
    const invoicePeriod = billed > 0 ? `${period}${TOP_UP}` : period;
    return quantity > 0
      ? [{ contractId: contract.id, period: invoicePeriod, quantity, unitPrice, amount: Math.round(unitPrice * quantity) }]
      : [];
  });
  if (rows.length === 0) return 0;

  const codes = await nextDocumentCodes(tx, 'INV', rows.length);
  const dueDate = invoiceDueDate(new Date());
  const created = await tx.invoice.createManyAndReturn({
    data: rows.map(({ contractId, period: invoicePeriod, amount }, i) => ({
      code: codes[i]!,
      contractId,
      type: 'ROOM_FEE' as const,
      period: invoicePeriod,
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
}

/**
 * Lập hóa đơn tiền phòng tháng `period` (đã bắt đầu) cho mọi hợp đồng có ở trong tháng mà chưa lập
 * đủ tháng đó. Hợp đồng vừa ký trong tháng đã có hóa đơn từ lúc ký nên không bị lập lại.
 * Trả số hóa đơn đã lập.
 */
export async function billMonth(period: string) {
  const monthStart = monthStartVN(period);
  const monthEnd = nextMonthStartVN(period);
  if (monthStart > new Date()) throw new Error(`Tháng ${period} chưa bắt đầu, chưa lập hóa đơn tiền phòng được`);

  return prisma.$transaction(async (tx) => {
    await lockBilling(tx);

    const contracts = await tx.contract.findMany({
      where: {
        // Hợp đồng đã ký: đang ở, hoặc đã chấm dứt trong tháng (lần chạy bù sau khi server ngủ).
        status: { in: ['ACTIVE', 'TERMINATED'] },
        signedAt: { lt: monthEnd },
        startDate: { lt: monthEnd },
        endDate: { gte: monthStart },
        OR: [{ terminatedAt: null }, { terminatedAt: { gte: monthStart } }],
      },
      select: billSelect(period),
    });
    return createRoomFees(tx, contracts, period);
  });
}

/**
 * Lập hóa đơn tháng đầu ngay khi SV ký — gọi bên trong transaction ký (contract.service.ts → sign),
 * sau khi đã ghi `signedAt`. Tháng đầu là tháng SV bắt đầu ở: tháng của ngày bắt đầu, hoặc của ngày
 * ký nếu ký muộn hơn. Ký trước kỳ ở thì đây là hóa đơn của tháng sắp tới. Các tháng sau do
 * `billMonth` lập vào đầu từng tháng.
 */
export async function billFirstMonth(tx: Prisma.TransactionClient, contractId: string) {
  await lockBilling(tx);
  const { startDate, signedAt } = await tx.contract.findUniqueOrThrow({ where: { id: contractId }, select: STAY_SELECT });
  const period = monthOfVN(new Date(Math.max(startDate.getTime(), signedAt?.getTime() ?? 0)));
  const contract = await tx.contract.findUniqueOrThrow({ where: { id: contractId }, select: billSelect(period) });
  return createRoomFees(tx, [contract], period);
}

/** Lập hóa đơn cho các tháng đã bắt đầu còn thiếu — tháng này và vài tháng trước, cũ trước mới sau. */
export async function billPendingMonths() {
  const thisMonth = currentMonthVN();
  let total = 0;
  for (let n = LOOKBACK_MONTHS - 1; n >= 0; n--) total += await billMonth(shiftMonth(thisMonth, -n));
  return total;
}

/**
 * Hẹn giờ ngay trong tiến trình server, không cần cron ngoài: chạy lúc khởi động (bù những lần server
 * tắt / ngủ qua đầu tháng) rồi mỗi giờ — nên hóa đơn tháng mới có trong giờ đầu tiên của ngày 1.
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

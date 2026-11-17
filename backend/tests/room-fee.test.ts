import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import * as contractService from '../src/modules/contracts/contract.service.js';
import { billMonth, billPendingMonths, roomFeeQuantity } from '../src/modules/invoices/room-fee.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { calendarDaysVN, currentMonthVN, formatDateVN, monthStartVN, nextMonthStartVN, shiftMonth } from '../src/utils/date-vn.js';
import { createActiveContract, createBuilding, createRoom, createStudent } from './factory.js';

const DAY = 24 * 60 * 60 * 1000;
const PRICE = 500_000;

describe('Tiền phòng hằng tháng — quy tắc nửa tháng', () => {
  const lastMonth = shiftMonth(currentMonthVN(), -1);
  /** 10 giờ sáng (giờ VN) ngày `n` của tháng trước. */
  const day = (n: number) => new Date(monthStartVN(lastMonth).getTime() + (n - 1) * DAY + 10 * 60 * 60 * 1000);
  const lastDay = calendarDaysVN(monthStartVN(lastMonth), new Date(nextMonthStartVN(lastMonth).getTime() - 1));
  const longBefore = new Date(monthStartVN(lastMonth).getTime() - 40 * DAY);
  const farAfter = new Date(nextMonthStartVN(lastMonth).getTime() + 120 * DAY);

  let beds: { id: string; roomId: string }[];
  let students: AuthUser[];

  /** Hợp đồng ở giường thứ `i`, mặc định ở trọn tháng trước và còn ở tiếp. */
  const contract = (i: number, dates: { startDate?: Date; endDate?: Date; signedAt?: Date } = {}) =>
    createActiveContract(students[i]!, beds[i]!, { price: PRICE, startDate: longBefore, endDate: farAfter, ...dates });
  const roomFees = () =>
    prisma.invoice.findMany({
      where: { type: 'ROOM_FEE' },
      include: { items: true },
      orderBy: { amount: 'asc' },
    });

  beforeEach(async () => {
    const room = await createRoom((await createBuilding('MALE')).id, 4);
    beds = room.beds;
    students = [];
    for (let i = 0; i < 4; i++) students.push(await createStudent('MALE'));
  });

  it('dưới 15 ngày nửa tháng, từ 15 ngày cả tháng', () => {
    expect([0, 1, 14, 15, 31].map(roomFeeQuantity)).toEqual([0, 0.5, 0.5, 1, 1]);
  });

  it('ở trọn tháng → một hóa đơn cả tháng theo giá hợp đồng; chạy lại không lập trùng', async () => {
    const c = await contract(0);

    expect(await billMonth(lastMonth)).toBe(1);
    const [invoice] = await roomFees();
    expect(invoice).toMatchObject({ contractId: c.id, period: lastMonth, status: 'UNPAID' });
    expect(Number(invoice!.amount)).toBe(PRICE);
    expect(formatDateVN(invoice!.dueDate)).toBe(formatDateVN(new Date(Date.now() + 4 * DAY)));
    expect(invoice!.items.map((i) => [i.type, Number(i.quantity), Number(i.unitPrice), Number(i.amount)])).toEqual([
      ['ROOM_FEE', 1, PRICE, PRICE],
    ]);

    expect(await billMonth(lastMonth)).toBe(0);
    expect(await roomFees()).toHaveLength(1);
  });

  it('ký giữa tháng: tính từ ngày ký — còn dưới 15 ngày thì nửa tháng', async () => {
    await contract(0, { signedAt: day(lastDay - 13) }); // 14 ngày
    await contract(1, { signedAt: day(lastDay - 14) }); // 15 ngày
    await contract(2, { startDate: day(lastDay - 13), signedAt: longBefore }); // ký sớm, ở từ ngày bắt đầu: 14 ngày

    await billMonth(lastMonth);
    expect((await roomFees()).map((i) => Number(i.amount))).toEqual([PRICE / 2, PRICE / 2, PRICE]);
  });

  it('chấm dứt giữa tháng: tính tới ngày chấm dứt; chấm dứt trước tháng thì không lập', async () => {
    const leaving = await contract(0);
    const left = await contract(1);
    await prisma.contract.update({ where: { id: leaving.id }, data: { status: 'TERMINATED', terminatedAt: day(5) } });
    await prisma.contract.update({ where: { id: left.id }, data: { status: 'TERMINATED', terminatedAt: longBefore } });

    expect(await billMonth(lastMonth)).toBe(1);
    const [invoice] = await roomFees();
    expect(invoice).toMatchObject({ contractId: leaving.id });
    expect(Number(invoice!.amount)).toBe(PRICE / 2);
  });

  it('không lập cho hợp đồng chưa ký, và hợp đồng kiểu cũ đã có hóa đơn cả kỳ', async () => {
    const draft = await contract(0);
    await prisma.contract.update({ where: { id: draft.id }, data: { status: 'DRAFT', signedAt: null } });
    const legacy = await contract(1);
    await prisma.invoice.create({
      data: { code: 'INV-OLD-1', contractId: legacy.id, type: 'ROOM_FEE', period: '2026-HK1', amount: 1_500_000, dueDate: farAfter },
    });

    expect(await billMonth(lastMonth)).toBe(0);
  });

  it('hợp đồng kiểu cũ: chỉ tính những ngày ở sau mốc đã trả theo hóa đơn cả kỳ / gia hạn', async () => {
    const termOnly = await contract(0);
    const extended = await contract(1);
    await prisma.registrationPeriod.updateMany({ data: { stayEndAt: longBefore } });
    const paidUntil = formatDateVN(day(lastDay - 10)).split('/').reverse().join('');
    await prisma.invoice.createMany({
      data: [
        { code: 'INV-OLD-1', contractId: termOnly.id, type: 'ROOM_FEE', period: '2026-HK1', amount: 1_500_000, dueDate: farAfter },
        { code: 'INV-OLD-2', contractId: extended.id, type: 'ROOM_FEE', period: '2026-HK1', amount: 1_500_000, dueDate: farAfter },
        { code: 'INV-OLD-3', contractId: extended.id, type: 'ROOM_FEE', period: `2026-HK1-GH-${paidUntil}`, amount: 500_000, dueDate: farAfter },
      ],
    });
    expect(await billMonth(lastMonth)).toBe(2);
    const billed = await prisma.invoice.findMany({ where: { period: lastMonth }, select: { contractId: true, amount: true } });
    expect(Object.fromEntries(billed.map((i) => [i.contractId, Number(i.amount)]))).toEqual({
      [termOnly.id]: PRICE,
      [extended.id]: PRICE / 2,
    });
  });
  it('tháng kết thúc đã lập nửa tháng, gia hạn xong lần chạy sau lập bổ sung nửa còn lại', async () => {
    const c = await contract(0, { endDate: day(10) });
    expect(await billMonth(lastMonth)).toBe(1);
    await prisma.contract.update({ where: { id: c.id }, data: { endDate: farAfter } });
    expect(await billMonth(lastMonth)).toBe(1);
    expect(await billMonth(lastMonth)).toBe(0);
    const invoices = await roomFees();
    expect(invoices.map((i) => `${i.period} ${Number(i.amount)} ${Number(i.items[0]!.quantity)}`).sort()).toEqual([
      `${lastMonth} ${PRICE / 2} 0.5`,
      `${lastMonth}-BS ${PRICE / 2} 0.5`,
    ]);
  });
  it('ở quá ngày kết thúc chưa gia hạn thì chưa tính; gia hạn xong lần chạy sau lập bù', async () => {
    const overstay = await contract(0, { endDate: new Date(monthStartVN(lastMonth).getTime() - 1) });
    const periods = async () => (await roomFees()).map((i) => i.period);

    await billPendingMonths();
    expect(await periods()).not.toContain(lastMonth);
    await prisma.contract.update({ where: { id: overstay.id }, data: { endDate: farAfter } });
    await billPendingMonths();
    expect(await periods()).toContain(lastMonth);
  });

  it('trả trước: tháng này lập luôn, cả tháng; tháng chưa bắt đầu thì chưa lập', async () => {
    await contract(0);
    const nextMonth = shiftMonth(currentMonthVN(), 1);
    await expect(billMonth(nextMonth)).rejects.toThrow('chưa bắt đầu');

    await billPendingMonths();
    const invoices = await roomFees();
    expect(invoices.map((i) => i.period)).toEqual(expect.arrayContaining([lastMonth, currentMonthVN()]));
    expect(invoices.map((i) => i.period)).not.toContain(nextMonth);
    expect(invoices.every((i) => Number(i.amount) === PRICE)).toBe(true);
  });
});

describe('Tiền phòng tháng đầu — lập ngay lúc ký', () => {
  const thisMonth = currentMonthVN();
  const nextMonth = shiftMonth(thisMonth, 1);
  const farAfter = new Date(nextMonthStartVN(nextMonth).getTime() + 120 * DAY);

  /** Hợp đồng chờ ký của một SV mới, ở tới `farAfter`. */
  async function draftContract(startDate: Date) {
    const room = await createRoom((await createBuilding('MALE')).id, 1);
    const student = await createStudent('MALE');
    const contract = await createActiveContract(student, room.beds[0]!, { price: PRICE, startDate, endDate: farAfter });
    await prisma.contract.update({ where: { id: contract.id }, data: { status: 'DRAFT', signedAt: null } });
    return { student, contract };
  }
  const roomFees = (contractId: string) =>
    prisma.invoice.findMany({ where: { contractId, type: 'ROOM_FEE' }, include: { items: true } });

  it('kỳ ở đã bắt đầu: hóa đơn tháng này tính từ ngày ký; bộ hẹn giờ không lập lại tháng đó', async () => {
    const { student, contract } = await draftContract(new Date(monthStartVN(thisMonth).getTime() - 40 * DAY));

    await contractService.sign(student, contract.id);
    const now = new Date();
    const daysLeft = calendarDaysVN(now, new Date(nextMonthStartVN(thisMonth).getTime() - 1));
    const [invoice, ...rest] = await roomFees(contract.id);
    expect(rest).toHaveLength(0);
    expect(invoice).toMatchObject({ period: thisMonth, status: 'UNPAID' });
    expect(Number(invoice!.amount)).toBe(PRICE * roomFeeQuantity(daysLeft));

    expect(await billMonth(thisMonth)).toBe(0);
  });

  it('ký trước kỳ ở: hóa đơn tháng đầu là tháng bắt đầu ở, lập ngay lúc ký', async () => {
    const { student, contract } = await draftContract(new Date(monthStartVN(nextMonth).getTime() + 10 * 60 * 60 * 1000));

    await contractService.sign(student, contract.id);
    const [invoice, ...rest] = await roomFees(contract.id);
    expect(rest).toHaveLength(0);
    expect(invoice).toMatchObject({ period: nextMonth });
    expect(Number(invoice!.amount)).toBe(PRICE);

    // Tháng này SV chưa ở ngày nào — bộ hẹn giờ không lập gì.
    expect(await billMonth(thisMonth)).toBe(0);
  });
});

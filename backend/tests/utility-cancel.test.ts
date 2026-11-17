import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { bill, cancel, sheet } from '../src/modules/invoices/utility.service.js';
import { pay } from '../src/modules/payments/payment.service.js';
import { remove } from '../src/modules/users/user.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { currentMonthVN } from '../src/utils/date-vn.js';
import { createActiveContract, createAdmin, createBuilding, createManager, createRoom, createStudent } from './factory.js';

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** "2026-01" → "2025-12". */
function previousMonth(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 2, 1)).toISOString().slice(0, 7);
}

describe('Hủy lần chốt điện nước của một phòng', () => {
  const thisMonth = currentMonthVN();
  const lastMonth = previousMonth(thisMonth);
  let admin: AuthUser;
  let manager: AuthUser;
  let students: AuthUser[];
  let buildingId: string;
  let roomId: string;

  const reading = { electricOld: 100, electricNew: 250, waterOld: 10, waterNew: 22 };
  const billRoom = (period: string, r = reading) => bill(admin, { buildingId, period, readings: [{ roomId, ...r }] });
  const roomInvoices = (period: string) =>
    prisma.invoice.findMany({ where: { type: 'UTILITY', period, contract: { bed: { roomId } } } });

  beforeEach(async () => {
    buildingId = (await createBuilding('MALE')).id;
    const room = await createRoom(buildingId, 2);
    roomId = room.id;
    admin = await createAdmin();
    manager = await createManager(buildingId);
    students = [await createStudent('MALE'), await createStudent('MALE')];
    // Vào ở từ 2 tháng trước để được chia tiền cả tháng trước.
    for (const [i, student] of students.entries()) {
      await createActiveContract(student, room.beds[i]!, { startDate: new Date(Date.now() - 60 * DAY) });
    }
  });

  it('hóa đơn điện nước lưu người chốt; quản lý đã chốt thì không xóa được tài khoản', async () => {
    await bill(manager, { buildingId, period: thisMonth, readings: [{ roomId, ...reading }] });
    expect((await roomInvoices(thisMonth)).map((i) => i.createdById)).toEqual([manager.id, manager.id]);
    await expect(remove(admin, manager.id)).rejects.toMatchObject({ status: 409, code: 'USER_HAS_HISTORY' });
  });

  it('xóa hóa đơn của cả phòng, trả lại chỉ số đã nhập, rồi chốt lại được', async () => {
    await billRoom(thisMonth);

    expect(await cancel(manager, { roomId, period: thisMonth })).toEqual({ invoiceCount: 2, reading });
    expect(await roomInvoices(thisMonth)).toHaveLength(0);
    expect(await prisma.invoiceItem.count()).toBe(0);
    const [row] = (await sheet(manager, { buildingId, period: thisMonth })).rooms;
    expect(row).toMatchObject({ billed: false, cancelBlock: null });

    await expect(billRoom(thisMonth, { ...reading, electricNew: 200 })).resolves.toMatchObject({ invoiceCount: 2 });
  });

  it('đã có SV trả tiền thì không hủy được, không xóa gì', async () => {
    await billRoom(thisMonth);
    const [first] = await roomInvoices(thisMonth);
    await prisma.invoice.update({ where: { id: first!.id }, data: { status: 'PAID' } });

    await expect(cancel(manager, { roomId, period: thisMonth })).rejects.toMatchObject({ status: 409, code: 'UTILITY_PAID' });
    expect(await roomInvoices(thisMonth)).toHaveLength(2);
    const [row] = (await sheet(manager, { buildingId, period: thisMonth })).rooms;
    expect(row).toMatchObject({ billed: true, cancelBlock: 'PAID' });
  });

  it('SV đang ở cổng VNPay thì chặn; giao dịch đã hết hạn hoặc thất bại thì xóa cùng hóa đơn', async () => {
    await billRoom(thisMonth);
    const [first] = await roomInvoices(thisMonth);
    const owner = students[0]!;
    const own = (await prisma.invoice.findFirst({
      where: { type: 'UTILITY', period: thisMonth, contract: { registration: { studentId: owner.id } } },
    }))!;
    await pay(owner, own.id, '127.0.0.1');

    await expect(cancel(manager, { roomId, period: thisMonth })).rejects.toMatchObject({
      status: 409,
      code: 'PAYMENT_IN_PROGRESS',
    });

    // Quá hạn VNPay (15 phút) + 5 phút chờ IPN thì coi như bỏ dở.
    await prisma.payment.updateMany({ data: { createdAt: new Date(Date.now() - 21 * MINUTE) } });
    await prisma.payment.create({ data: { invoiceId: first!.id, amount: 1, txnRef: 'failed1', status: 'FAILED' } });
    await expect(cancel(manager, { roomId, period: thisMonth })).resolves.toMatchObject({ invoiceCount: 2 });
    expect(await prisma.payment.count()).toBe(0);
  });

  it('đã chốt tháng sau thì phải hủy tháng sau trước', async () => {
    await billRoom(lastMonth, { electricOld: 0, electricNew: 100, waterOld: 0, waterNew: 10 });
    await billRoom(thisMonth);

    await expect(cancel(manager, { roomId, period: lastMonth })).rejects.toMatchObject({
      status: 409,
      code: 'LATER_PERIOD_BILLED',
    });
    const [row] = (await sheet(manager, { buildingId, period: lastMonth })).rooms;
    expect(row).toMatchObject({ billed: true, cancelBlock: 'LATER_BILLED' });

    await cancel(manager, { roomId, period: thisMonth });
    await expect(cancel(manager, { roomId, period: lastMonth })).resolves.toMatchObject({ invoiceCount: 2 });
  });

  it('Manager tòa khác nhận 403; phòng chưa chốt tháng đó thì 404', async () => {
    await billRoom(thisMonth);
    const otherManager = await createManager((await createBuilding('FEMALE')).id);

    await expect(cancel(otherManager, { roomId, period: thisMonth })).rejects.toMatchObject({ status: 403 });
    await expect(cancel(admin, { roomId, period: lastMonth })).rejects.toMatchObject({ status: 404 });
    expect(await roomInvoices(thisMonth)).toHaveLength(2);
  });
});

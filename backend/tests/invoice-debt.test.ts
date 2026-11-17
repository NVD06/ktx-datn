import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { debtByBuilding } from '../src/modules/invoices/invoice.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createAdmin, createBuilding, createManager, createStudent, createUnpaidInvoice } from './factory.js';

const DAY = 24 * 60 * 60 * 1000;

describe('Công nợ theo tòa (US-04.6)', () => {
  let admin: AuthUser;
  let manager: AuthUser; // quản lý tòa 1
  let ids: string[]; // id 3 tòa theo thứ tự tên

  beforeEach(async () => {
    const buildings = [await createBuilding('MALE'), await createBuilding('FEMALE'), await createBuilding('MALE')];
    ids = buildings.map((b) => b.id);
    admin = await createAdmin();
    manager = await createManager(ids[0]!);

    const invoice = async (buildingId: string, amount: number, dueInDays: number) =>
      createUnpaidInvoice(await createStudent('MALE'), {
        buildingId,
        amount,
        dueDate: new Date(Date.now() + dueInDays * DAY),
      });
    // Tòa 1: một hóa đơn còn hạn, một quá hạn, một đã trả (không tính).
    await invoice(ids[0]!, 1_000_000, 5);
    await invoice(ids[0]!, 500_000, -2);
    const paid = await invoice(ids[0]!, 700_000, -10);
    await prisma.invoice.update({ where: { id: paid.id }, data: { status: 'PAID' } });
    // Tòa 2: một hóa đơn quá hạn. Tòa 3: không nợ gì.
    await invoice(ids[1]!, 300_000, -1);
  });

  it('Admin thấy mọi tòa theo tên, tòa không nợ vẫn có mặt với số 0', async () => {
    const rows = await debtByBuilding(admin);

    expect(rows.map((r) => r.building.id)).toEqual(ids);
    expect(rows.map(({ unpaid, overdue }) => ({ unpaid, overdue }))).toEqual([
      { unpaid: { count: 2, amount: '1500000' }, overdue: { count: 1, amount: '500000' } },
      { unpaid: { count: 1, amount: '300000' }, overdue: { count: 1, amount: '300000' } },
      { unpaid: { count: 0, amount: '0' }, overdue: { count: 0, amount: '0' } },
    ]);
  });

  it('Manager chỉ thấy tòa mình', async () => {
    const rows = await debtByBuilding(manager);
    expect(rows.map((r) => r.building.id)).toEqual([ids[0]]);
  });
});

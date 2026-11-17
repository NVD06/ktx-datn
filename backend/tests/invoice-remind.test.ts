import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { announcementInputSchema } from '../src/modules/announcements/announcement.schema.js';
import { list, listMine, remove as removeAnnouncement, update } from '../src/modules/announcements/announcement.service.js';
import { remind } from '../src/modules/invoices/invoice.service.js';
import { remove as removeUser } from '../src/modules/users/user.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createAdmin, createBuilding, createManager, createStudent, createUnpaidInvoice } from './factory.js';

const DAY = 24 * 60 * 60 * 1000;

describe('Nhắc nộp tiền', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let buildingId: string;
  let otherBuildingId: string;

  beforeEach(async () => {
    buildingId = (await createBuilding('MALE')).id;
    otherBuildingId = (await createBuilding('MALE')).id;
    admin = await createAdmin();
    manager = await createManager(buildingId);
  });

  it('mỗi SV một tin riêng gộp các hóa đơn, Manager chỉ nhắc tòa mình, hóa đơn đã nhắc hôm nay không gửi trùng', async () => {
    const [owing, foreign, paid] = [await createStudent('MALE'), await createStudent('MALE'), await createStudent('MALE')];
    await createUnpaidInvoice(owing, { buildingId, amount: 1_500_000, dueDate: new Date(Date.now() - DAY) });
    const small = await createUnpaidInvoice(owing, { buildingId, amount: 300_000 });
    await createUnpaidInvoice(foreign, { buildingId: otherBuildingId });
    const settled = await createUnpaidInvoice(paid, { buildingId });
    await prisma.invoice.update({ where: { id: settled.id }, data: { status: 'PAID' } });

    expect(await remind(manager, {})).toEqual({ students: 1, invoices: 2, skipped: 0 });
    const [reminder] = await listMine(owing);
    expect(reminder).toMatchObject({ title: 'Nhắc nộp tiền: 2 hóa đơn chưa thanh toán, 1 đã quá hạn', recipientId: owing.id });
    expect(reminder!.content).toContain('Tổng cần thanh toán 1.800.000 đ');
    expect(await listMine(foreign)).toEqual([]);
    expect(await listMine(paid)).toEqual([]);
    expect((await list(manager, {})).meta.total).toBe(0);

    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: small.id } })).remindedAt).toBeInstanceOf(Date);
    expect(await remind(admin, {})).toEqual({ students: 1, invoices: 1, skipped: 2 });
    expect(await remind(admin, { invoiceIds: [small.id, settled.id] })).toEqual({ students: 0, invoices: 0, skipped: 1 });
    await prisma.invoice.update({ where: { id: small.id }, data: { remindedAt: new Date(Date.now() - DAY) } });
    expect(await remind(admin, { invoiceIds: [small.id] })).toEqual({ students: 1, invoices: 1, skipped: 0 });
    expect((await listMine(owing))[0]).toMatchObject({ title: `Nhắc nộp tiền hóa đơn ${small.code}` });
    expect(await prisma.announcement.count()).toBe(3);
  });

  it('hai lần bấm cùng lúc chỉ gửi một tin', async () => {
    const student = await createStudent('MALE');
    const invoice = await createUnpaidInvoice(student, { buildingId });

    const results = await Promise.all([remind(admin, { invoiceIds: [invoice.id] }), remind(manager, { invoiceIds: [invoice.id] })]);
    expect(results.map((r) => r.invoices).sort()).toEqual([0, 1]);
    expect(await prisma.announcement.count({ where: { recipientId: student.id } })).toBe(1);
  });

  it('hóa đơn ngoài phạm vi hoặc không tồn tại thì báo lỗi, không gửi gì', async () => {
    const foreign = await createUnpaidInvoice(await createStudent('MALE'), { buildingId: otherBuildingId });

    await expect(remind(manager, { invoiceIds: [foreign.id] })).rejects.toMatchObject({ status: 403 });
    await expect(remind(admin, { invoiceIds: [crypto.randomUUID()] })).rejects.toMatchObject({ status: 404 });
    expect(await prisma.announcement.count()).toBe(0);
  });

  it('tin riêng không sửa / xóa được qua bảng tin; người đã gửi nhắc không xóa được tài khoản', async () => {
    await createUnpaidInvoice(await createStudent('MALE'), { buildingId });
    await remind(manager, {});
    const { id } = await prisma.announcement.findFirstOrThrow();

    const input = announcementInputSchema.parse({ title: 'Sửa', content: 'Nội dung' });
    await expect(update(admin, id, input)).rejects.toMatchObject({ status: 404 });
    await expect(removeAnnouncement(admin, id)).rejects.toMatchObject({ status: 404 });
    await expect(removeUser(admin, manager.id)).rejects.toMatchObject({
      code: 'USER_HAS_HISTORY',
      message: expect.stringContaining('tin nhắc nộp tiền đã gửi'),
    });
  });
});

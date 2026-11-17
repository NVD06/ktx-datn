import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { monthRangeQuerySchema } from '../src/modules/reports/report.schema.js';
import { debt, debtors, maintenance, occupancy, overview, revenue } from '../src/modules/reports/report.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { currentMonthVN, halfMonthStartVN, monthStartVN, shiftMonth } from '../src/utils/date-vn.js';
import {
  createActiveContract,
  createAdmin,
  createBuilding,
  createManager,
  createPeriod,
  createRegistration,
  createRoom,
  createStudent,
  createUnpaidInvoice,
} from './factory.js';

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/*
 * Hai tòa, mỗi tòa một phòng 2 giường có một SV đang ở. Tòa của Manager có thêm một phòng ngừng
 * hoạt động (không tính vào sức chứa).
 */
describe('Dashboard (US-06.1)', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let student: AuthUser;
  let roomId: string;
  let mine: Awaited<ReturnType<typeof createActiveContract>>;
  let other: Awaited<ReturnType<typeof createActiveContract>>;
  let seq = 0;

  const invoice = (contractId: string, amount: number, dueInDays: number, type: 'ROOM_FEE' | 'UTILITY' = 'ROOM_FEE') =>
    prisma.invoice.create({
      data: { code: `INV-R-${++seq}`, contractId, type, period: `P${seq}`, amount, dueDate: new Date(Date.now() + dueInDays * DAY) },
    });
  const payment = (invoiceId: string, amount: number, paidAt: Date, status: 'SUCCESS' | 'FAILED' = 'SUCCESS') =>
    prisma.payment.create({ data: { invoiceId, amount, status, txnRef: `TXN${++seq}`, paidAt } });

  beforeEach(async () => {
    const male = await createBuilding('MALE');
    const female = await createBuilding('FEMALE');
    admin = await createAdmin();
    manager = await createManager(male.id);

    const room = await createRoom(male.id, 2);
    roomId = room.id;
    const closed = await createRoom(male.id, 2);
    await prisma.room.update({ where: { id: closed.id }, data: { isActive: false } });
    const otherRoom = await createRoom(female.id, 2);

    const lastMonth = new Date(Date.now() - 30 * DAY);
    student = await createStudent('MALE');
    mine = await createActiveContract(student, room.beds[0]!, {
      startDate: lastMonth,
      endDate: new Date(Date.now() + 10 * DAY), // sắp hết hạn
    });
    other = await createActiveContract(await createStudent('FEMALE'), otherRoom.beds[0]!, { startDate: lastMonth });
    await prisma.bed.updateMany({ where: { id: { in: [room.beds[0]!.id, otherRoom.beds[0]!.id] } }, data: { status: 'OCCUPIED' } });
  });

  it('Manager chỉ thấy tòa mình, Admin thấy cả hệ thống', async () => {
    await invoice(mine.id, 500_000, -2); // quá hạn
    await invoice(other.id, 300_000, 5);
    await prisma.maintenanceRequest.create({ data: { roomId, studentId: student.id, title: 'Hỏng đèn', description: '-' } });

    const scoped = await overview(manager);
    expect(scoped.beds).toEqual({ total: 2, occupied: 1 }); // phòng ngừng hoạt động không tính
    expect(scoped.residents).toBe(1);
    expect(scoped.expiringContracts).toEqual({ count: 1, withinDays: 30 });
    expect(scoped.invoices).toEqual({ unpaid: { count: 1, amount: '500000' }, overdue: { count: 1, amount: '500000' } });
    expect(scoped.requests).toEqual({ open: 1, byStatus: { PENDING: 1, RECEIVED: 0, DONE: 0, CONFIRMED: 0, REJECTED: 0 } });

    const all = await overview(admin);
    expect(all.beds).toEqual({ total: 4, occupied: 2 });
    expect(all.residents).toBe(2);
    expect(all.invoices.unpaid).toEqual({ count: 2, amount: '800000' });
    expect(all.requests.open).toBe(1);
  });

  it('việc chờ xử lý và số liệu từng tòa theo phạm vi', async () => {
    const thisMonth = currentMonthVN();
    await prisma.registrationPeriod.updateMany({ data: { isOpen: false } });
    const period = await createPeriod();
    const female = await prisma.bed.findUniqueOrThrow({ where: { id: other.bedId }, select: { room: { select: { buildingId: true } } } });
    await createRegistration(await createStudent('MALE'), period.id, manager.buildingId!);
    await createRegistration(await createStudent('FEMALE'), period.id, female.room.buildingId);
    await prisma.contract.update({ where: { id: mine.id }, data: { extensionRequestedTo: new Date(Date.now() + 90 * DAY) } });
    await invoice(other.id, 300_000, -2, 'UTILITY');
    await prisma.invoice.update({ where: { code: `INV-R-${seq}` }, data: { period: thisMonth } });
    await prisma.maintenanceRequest.create({ data: { roomId, studentId: student.id, title: 'Hỏng đèn', description: '-' } });
    await prisma.hygieneRecord.create({
      data: { roomId, checkDate: halfMonthStartVN(new Date()), score: 55, deduction: 45, checkedById: manager.id },
    });

    const scoped = await overview(manager);
    expect(scoped.todo).toEqual({
      registrations: 1,
      unsignedContracts: 0,
      extensionRequests: 1,
      unbilledRooms: 1,
      newRequests: 1,
      lowHygieneRooms: 1,
    });
    expect(scoped.buildings).toHaveLength(1);
    expect(scoped.buildings[0]).toMatchObject({
      id: manager.buildingId,
      beds: { total: 2, occupied: 1 },
      openRequests: 1,
      hygieneAverage: 55,
      lowHygieneRooms: 1,
    });
    expect(scoped.openPeriod).toMatchObject({ id: period.id, pending: 1 });
    expect(scoped.recentUsers).toEqual([]);
    expect(scoped.buildings[0]).toMatchObject({ gender: 'MALE', rooms: 1 });

    const all = await overview(admin);
    expect(all.todo).toMatchObject({ registrations: 2, unbilledRooms: 1 });
    expect(all.buildings.map((b) => b.overdue.count).sort()).toEqual([0, 1]);
    expect(all.openPeriod?.pending).toBe(2);
    expect(all.recentUsers).toHaveLength(5);
  });

  it('SV đã ký cho kỳ sau mà chưa tới ngày vào ở không tính là đang ở', async () => {
    await prisma.contract.update({ where: { id: mine.id }, data: { startDate: new Date(Date.now() + 5 * DAY) } });
    expect((await overview(manager)).residents).toBe(0);
  });

  it('doanh thu 6 tháng: chỉ giao dịch thành công, chia tháng theo giờ VN, tách tiền phòng / điện nước', async () => {
    const thisMonth = currentMonthVN();
    const monthStart = monthStartVN(thisMonth);
    const roomFee = await invoice(mine.id, 500_000, 5);
    const utility = await invoice(mine.id, 120_000, 5, 'UTILITY');

    await payment(roomFee.id, 500_000, new Date(monthStart.getTime() - 30 * MINUTE)); // 23:30 ngày cuối tháng trước
    await payment(utility.id, 120_000, new Date(monthStart.getTime() + 30 * MINUTE)); // 00:30 ngày đầu tháng này
    await payment(utility.id, 120_000, new Date(monthStart.getTime() + 60 * MINUTE), 'FAILED');
    await payment((await invoice(other.id, 300_000, 5)).id, 300_000, new Date(monthStart.getTime() + 60 * MINUTE)); // tòa khác

    const { revenue } = await overview(manager);
    expect(revenue.map((m) => m.month)).toEqual([-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(thisMonth, n)));
    expect(revenue.slice(-2)).toEqual([
      { month: shiftMonth(thisMonth, -1), roomFee: '500000', utility: '0' },
      { month: thisMonth, roomFee: '0', utility: '120000' },
    ]);
    expect((await overview(admin)).revenue.at(-1)).toEqual({ month: thisMonth, roomFee: '300000', utility: '120000' });
  });
});

/*
 * Tòa của Manager: tầng 1 có phòng A (4 giường: có người, giữ chỗ, bảo trì, trống) và phòng B ngừng
 * hoạt động; tầng 2 có phòng C (2 giường trống). Tòa kia một phòng 2 giường có một người ở.
 */
describe('Báo cáo lấp đầy (US-06.2)', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let mineId: string;
  let otherId: string;

  beforeEach(async () => {
    const male = await createBuilding('MALE');
    const female = await createBuilding('FEMALE');
    mineId = male.id;
    otherId = female.id;
    admin = await createAdmin();
    manager = await createManager(male.id);

    const roomA = await createRoom(male.id, 4);
    const [occupied, held, broken] = roomA.beds;
    await createActiveContract(await createStudent('MALE'), occupied!);
    await prisma.bed.update({ where: { id: occupied!.id }, data: { status: 'OCCUPIED' } });
    await prisma.bed.update({ where: { id: broken!.id }, data: { status: 'MAINTENANCE' } });
    // Hợp đồng DRAFT chờ ký: giường vẫn AVAILABLE nhưng đã giữ chỗ.
    const period = await createPeriod();
    const registration = await createRegistration(await createStudent('MALE'), period.id, male.id);
    await prisma.contract.create({
      data: {
        code: 'HD-DRAFT-1',
        registrationId: registration.id,
        bedId: held!.id,
        startDate: period.stayStartAt,
        endDate: period.stayEndAt,
        price: 1_500_000,
        status: 'DRAFT',
      },
    });

    const closed = await createRoom(male.id, 2);
    await prisma.room.update({ where: { id: closed.id }, data: { isActive: false } });
    const upstairs = await createRoom(male.id, 2);
    await prisma.room.update({ where: { id: upstairs.id }, data: { floor: 2 } });

    const otherRoom = await createRoom(female.id, 2);
    await createActiveContract(await createStudent('FEMALE'), otherRoom.beds[0]!);
    await prisma.bed.update({ where: { id: otherRoom.beds[0]!.id }, data: { status: 'OCCUPIED' } });
  });

  it('tòa → tầng → phòng, đếm từng trạng thái giường, bỏ phòng ngừng hoạt động', async () => {
    const [building, ...rest] = await occupancy(manager, {});
    expect(rest).toHaveLength(0);
    expect(building!.building.id).toBe(mineId);
    expect(building).toMatchObject({ bedCount: 6, occupiedBeds: 1, heldBeds: 1, maintenanceBeds: 1, availableBeds: 3 });
    expect(building!.floors.map((f) => f.floor)).toEqual([1, 2]);

    const [first, second] = building!.floors;
    expect(first).toMatchObject({ bedCount: 4, occupiedBeds: 1, heldBeds: 1, maintenanceBeds: 1, availableBeds: 1 });
    expect(first!.rooms).toHaveLength(1); // phòng ngừng hoạt động không có mặt
    expect(first!.rooms[0]).toMatchObject({ availableBeds: 1, status: 'AVAILABLE', roomType: { capacity: 4 } });
    expect(second!.rooms[0]).toMatchObject({ bedCount: 2, availableBeds: 2, status: 'AVAILABLE' });
  });

  it('tổng các tòa khớp ô tỷ lệ lấp đầy của dashboard', async () => {
    for (const user of [admin, manager]) {
      const report = await occupancy(user, {});
      const { beds } = await overview(user);
      expect(report.reduce((n, b) => n + b.bedCount, 0)).toBe(beds.total);
      expect(report.reduce((n, b) => n + b.occupiedBeds, 0)).toBe(beds.occupied);
    }
  });

  it('lọc theo tòa: Admin xem được tòa bất kỳ, Manager hỏi tòa khác bị 403, tòa không tồn tại 404', async () => {
    expect((await occupancy(admin, {})).map((b) => b.building.id).sort()).toEqual([mineId, otherId].sort());
    const [only, ...rest] = await occupancy(admin, { buildingId: otherId });
    expect(rest).toHaveLength(0);
    expect(only).toMatchObject({ building: { id: otherId }, bedCount: 2, occupiedBeds: 1 });

    await expect(occupancy(manager, { buildingId: otherId })).rejects.toMatchObject({ status: 403 });
    await expect(occupancy(admin, { buildingId: crypto.randomUUID() })).rejects.toMatchObject({ status: 404 });
  });
});

/*
 * Hai tòa nam, Manager quản lý tòa đầu. Mỗi giao dịch đi kèm một hóa đơn riêng của một SV mới.
 */
describe('Báo cáo doanh thu (US-06.3)', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  const thisMonth = currentMonthVN();
  let seq = 0;

  /** Giữa tháng cách tháng này `n` tháng — luôn còn nằm trong tháng đó theo giờ VN. */
  const midMonth = (n: number) => new Date(monthStartVN(shiftMonth(thisMonth, n)).getTime() + 10 * DAY);
  const pay = async (
    buildingId: string,
    amount: number,
    paidAt: Date,
    { type = 'ROOM_FEE', status = 'SUCCESS' }: { type?: 'ROOM_FEE' | 'UTILITY'; status?: 'SUCCESS' | 'FAILED' } = {},
  ) => {
    const invoice = await createUnpaidInvoice(await createStudent('MALE'), { buildingId, amount });
    await prisma.invoice.update({ where: { id: invoice.id }, data: { type } });
    await prisma.payment.create({ data: { invoiceId: invoice.id, amount, status, txnRef: `TXN-REV-${++seq}`, paidAt } });
  };

  beforeEach(async () => {
    const mine = await createBuilding('MALE');
    const other = await createBuilding('MALE');
    admin = await createAdmin();
    manager = await createManager(mine.id);

    await pay(mine.id, 1_500_000, midMonth(-2));
    await pay(mine.id, 200_000, new Date(monthStartVN(thisMonth).getTime() + 30 * MINUTE), { type: 'UTILITY' });
    await pay(mine.id, 1_500_000, midMonth(-1), { status: 'FAILED' }); // giao dịch lỗi không tính
    await pay(mine.id, 900_000, midMonth(-7)); // ngoài 6 tháng gần nhất
    await pay(other.id, 1_200_000, midMonth(-1)); // tòa khác
  });

  it('đủ mọi tháng trong khoảng, khớp biểu đồ dashboard, tổng chỉ tính trong khoảng', async () => {
    const report = await revenue(manager, { from: shiftMonth(thisMonth, -5), to: thisMonth });
    expect(report.months).toEqual((await overview(manager)).revenue);
    expect(report.months.at(-3)).toEqual({ month: shiftMonth(thisMonth, -2), roomFee: '1500000', utility: '0' });
    expect(report.months.at(-2)).toEqual({ month: shiftMonth(thisMonth, -1), roomFee: '0', utility: '0' });
    expect(report.total).toEqual({ roomFee: '1500000', utility: '200000' });

    const year = await revenue(manager, { from: shiftMonth(thisMonth, -11), to: thisMonth });
    expect(year.months).toHaveLength(12);
    expect(year.total).toEqual({ roomFee: '2400000', utility: '200000' });
  });

  it('Admin thấy doanh thu mọi tòa', async () => {
    const report = await revenue(admin, { from: shiftMonth(thisMonth, -5), to: thisMonth });
    expect(report.total).toEqual({ roomFee: '2700000', utility: '200000' });
    expect(report.months.at(-2)).toMatchObject({ roomFee: '1200000' });
  });

  it('khoảng tháng sai định dạng, ngược chiều hoặc quá 24 tháng không hợp lệ', () => {
    const valid = (from: string, to: string) => monthRangeQuerySchema.safeParse({ from, to }).success;
    expect(valid('2024-11', '2026-10')).toBe(true); // đúng 24 tháng
    expect(valid('2026-10', '2026-10')).toBe(true);
    expect(valid('2024-10', '2026-10')).toBe(false); // 25 tháng
    expect(valid('2026-10', '2026-09')).toBe(false);
    expect(valid('2026-13', '2026-12')).toBe(false);
  });
});

/*
 * Tòa của Manager: An nợ hai hóa đơn ở hai phòng (cũ quá hạn, mới còn hạn), Bình nợ một hóa đơn còn hạn
 * nhưng nhiều tiền hơn, Dũng đã trả hết. Tòa kia: Chi nợ một hóa đơn quá hạn.
 */
describe('Báo cáo công nợ (US-06.3)', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let an: AuthUser;
  let binh: AuthUser;
  let chi: AuthUser;
  let anNewRoomId: string;

  const due = (days: number) => new Date(Date.now() + days * DAY);

  beforeEach(async () => {
    const mine = await createBuilding('MALE');
    const other = await createBuilding('FEMALE');
    admin = await createAdmin();
    manager = await createManager(mine.id);

    an = await createStudent('MALE', 'Nguyễn Văn An');
    binh = await createStudent('MALE', 'Trần Văn Bình');
    chi = await createStudent('FEMALE', 'Lê Thị Chi');
    const dung = await createStudent('MALE', 'Phạm Văn Dũng');

    await createUnpaidInvoice(an, { buildingId: mine.id, amount: 500_000, dueDate: due(-3) });
    const anNew = await createUnpaidInvoice(an, { buildingId: mine.id, amount: 200_000, dueDate: due(5) });
    const { bed } = await prisma.contract.findUniqueOrThrow({ where: { id: anNew.contractId }, select: { bed: true } });
    anNewRoomId = bed.roomId;
    await createUnpaidInvoice(binh, { buildingId: mine.id, amount: 1_000_000, dueDate: due(5) });
    const paid = await createUnpaidInvoice(dung, { buildingId: mine.id, amount: 1_500_000, dueDate: due(-10) });
    await prisma.invoice.update({ where: { id: paid.id }, data: { status: 'PAID' } });
    await createUnpaidInvoice(chi, { buildingId: other.id, amount: 300_000, dueDate: due(-1) });
  });

  it('mỗi SV một dòng, quá hạn nhiều tiền nhất lên đầu, phòng của hợp đồng gần nhất', async () => {
    const { data, meta } = await debtors(manager, {});
    expect(meta).toEqual({ page: 1, limit: 20, total: 2 }); // Dũng đã trả, Chi ở tòa khác
    expect(data.map((d) => d.id)).toEqual([an.id, binh.id]); // An có quá hạn nên trước Bình dù nợ ít hơn

    expect(data[0]).toMatchObject({
      fullName: 'Nguyễn Văn An',
      unpaid: { count: 2, amount: '700000' },
      overdue: { count: 1, amount: '500000' },
      room: { id: anNewRoomId },
    });
    expect(data[1]).toMatchObject({ unpaid: { count: 1, amount: '1000000' }, overdue: { count: 0, amount: '0' } });

    expect((await debtors(admin, {})).data.map((d) => d.id)).toEqual([an.id, chi.id, binh.id]);
  });

  it('tìm theo tên và phân trang', async () => {
    expect((await debtors(admin, { search: 'văn an' })).data.map((d) => d.id)).toEqual([an.id]);

    const second = await debtors(admin, { page: 2, limit: 1 });
    expect(second.meta).toEqual({ page: 2, limit: 1, total: 3 });
    expect(second.data.map((d) => d.id)).toEqual([chi.id]);
  });

  it('tổng nợ các SV = tổng các tòa = ô "Chưa thanh toán" của dashboard', async () => {
    const sum = (amounts: string[]) => String(amounts.reduce((n, a) => n + Number(a), 0));
    for (const user of [admin, manager]) {
      const students = (await debtors(user, { limit: 100 })).data;
      const buildings = await debt(user);
      const { invoices } = await overview(user);

      expect(sum(students.map((s) => s.unpaid.amount))).toBe(invoices.unpaid.amount);
      expect(sum(buildings.map((b) => b.unpaid.amount))).toBe(invoices.unpaid.amount);
      expect(sum(students.map((s) => s.overdue.amount))).toBe(invoices.overdue.amount);
    }
    expect((await debt(manager)).map((b) => b.unpaid)).toEqual([{ count: 3, amount: '1700000' }]);
  });
});

/*
 * Tòa của Manager: 3 yêu cầu trong 6 tháng gần nhất (tháng trước 1 đã sửa xong; tháng này 1 đã xác nhận, 1 chờ
 * tiếp nhận) và 1 yêu cầu cũ hơn; 2 lần chấm trong khoảng (80, 50) và 1 lần cũ hơn (30). Tòa kia: 1 yêu cầu bị
 * từ chối, 1 lần chấm 40.
 */
describe('Báo cáo sửa chữa & vệ sinh (US-06.4)', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let roomId: string;
  const thisMonth = currentMonthVN();
  const range = { from: shiftMonth(thisMonth, -5), to: thisMonth };
  const at = (month: number, hours: number) => new Date(monthStartVN(shiftMonth(thisMonth, month)).getTime() + hours * HOUR);

  beforeEach(async () => {
    const mine = await createBuilding('MALE');
    const other = await createBuilding('FEMALE');
    admin = await createAdmin();
    manager = await createManager(mine.id);
    const room = await createRoom(mine.id, 2);
    roomId = room.id;
    const otherRoom = await createRoom(other.id, 2);
    const student = await createStudent('MALE');

    const request = (roomId: string, status: 'PENDING' | 'DONE' | 'CONFIRMED' | 'REJECTED', createdAt: Date) =>
      prisma.maintenanceRequest.create({ data: { roomId, studentId: student.id, title: 'Hỏng', description: '-', status, createdAt } });
    await request(room.id, 'DONE', at(-1, 24));
    await request(room.id, 'CONFIRMED', at(0, 1));
    await request(room.id, 'PENDING', at(0, 2));
    await request(room.id, 'DONE', at(-7, 24)); // ngoài khoảng
    await request(otherRoom.id, 'REJECTED', at(0, 3));

    const score = (roomId: string, checkDate: Date, score: number) =>
      prisma.hygieneRecord.create({ data: { roomId, checkDate, score, checkedById: manager.id } });
    await score(room.id, at(0, 0), 80);
    await score(room.id, at(0, 24), 50);
    await score(room.id, at(-7, 0), 30); // ngoài khoảng
    await score(otherRoom.id, at(0, 0), 40);
  });

  it('yêu cầu theo trạng thái từng tháng gửi, chỉ trong khoảng và trong phạm vi', async () => {
    const report = await maintenance(manager, range);
    expect(report.requests.months.map((m) => m.month)).toEqual([-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(thisMonth, n)));
    expect(report.requests.months.at(-1)!.byStatus).toEqual({ PENDING: 1, RECEIVED: 0, DONE: 0, CONFIRMED: 1, REJECTED: 0 });
    expect(report.requests.months.at(-2)!.byStatus).toMatchObject({ DONE: 1 });
    expect(report.requests.total).toEqual({ PENDING: 1, RECEIVED: 0, DONE: 1, CONFIRMED: 1, REJECTED: 0 });

    expect((await maintenance(admin, range)).requests.total).toMatchObject({ REJECTED: 1 });
  });

  it('các lần chấm dưới 60 trong khoảng, mới nhất trước', async () => {
    const report = await maintenance(manager, range);
    expect(report.lowScores).toHaveLength(1);
    expect(report.lowScores[0]).toMatchObject({ score: 50, room: { id: roomId } });

    expect((await maintenance(admin, range)).lowScores.map((r) => r.score)).toEqual([50, 40]);
  });
});

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { bedCodes } from '../src/modules/beds/bed-code.js';
import * as contractService from '../src/modules/contracts/contract.service.js';
import * as roomFeeService from '../src/modules/invoices/room-fee.service.js';
import * as utilityService from '../src/modules/invoices/utility.service.js';
import * as maintenanceService from '../src/modules/maintenance/maintenance.service.js';
import * as registrationService from '../src/modules/registrations/registration.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { currentMonthVN, monthStartVN, shiftMonth } from '../src/utils/date-vn.js';
import { dbTarget, isLocalDatabase } from './db-target.js';
const PASSWORD = '123456';
const BUILDINGS = 4;
const FLOORS = 5;
const ROOMS_PER_FLOOR = 10;
const HOUSED = 800;
const APPLICANTS = 800;
const DAY_MS = 24 * 60 * 60 * 1000;
if (!isLocalDatabase() || !dbTarget().endsWith('_tai')) {
  console.error(`Chỉ sinh dữ liệu cho CSDL kiểm thử tải trên máy này (tên kết thúc bằng _tai). Đang trỏ tới: ${dbTarget()}`);
  process.exit(1);
}
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
const tables = await prisma.$queryRaw<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
console.log('Tạo tòa, phòng, giường, tài khoản...');
const passwordHash = await hashPassword(PASSWORD);
const type8 = await prisma.roomType.create({ data: { name: 'Phòng 8 giường - quạt', capacity: 8, price: 250_000 } });
const type4 = await prisma.roomType.create({ data: { name: 'Phòng 4 giường - điều hòa', capacity: 4, price: 500_000 } });
const admin = await prisma.user.create({
  data: { email: 'admin@ktx.edu.vn', passwordHash, fullName: 'Quản trị viên', role: 'ADMIN' },
});
const buildings = await Promise.all(
  Array.from({ length: BUILDINGS }, async (_, i) => {
    const building = await prisma.building.create({
      data: { name: `B${i + 1}`, floors: FLOORS, gender: i < BUILDINGS / 2 ? 'MALE' : 'FEMALE' },
    });
    for (let floor = 1; floor <= FLOORS; floor++) {
      for (let n = 1; n <= ROOMS_PER_FLOOR; n++) {
        const type = n <= 2 ? type8 : type4;
        await prisma.room.create({
          data: {
            buildingId: building.id,
            roomTypeId: type.id,
            code: `${floor}${String(n).padStart(2, '0')}`,
            floor,
            beds: { create: bedCodes(type.capacity).map((code) => ({ code })) },
          },
        });
      }
    }
    const manager = await prisma.user.create({
      data: { email: `ql${i + 1}@ktx.edu.vn`, passwordHash, fullName: `Quản lý tòa B${i + 1}`, role: 'MANAGER', buildingId: building.id },
    });
    return { building, manager };
  }),
);
const students: AuthUser[] = Array.from({ length: HOUSED + APPLICANTS }, (_, i) => {
  const n = String(i + 1).padStart(4, '0');
  return { id: randomUUID(), email: `sv${n}@ktx.edu.vn`, fullName: `Sinh viên ${n}`, role: 'STUDENT', buildingId: null, mustChangePassword: false };
});
await prisma.user.createMany({
  data: students.map(({ id, email, fullName }, i) => ({ id, email, fullName, passwordHash, phone: `09${String(i + 1).padStart(8, '0')}` })),
});
await prisma.studentProfile.createMany({
  data: students.map(({ id }, i) => ({
    userId: id,
    studentCode: `SV${String(i + 1).padStart(4, '0')}`,
    gender: (i < HOUSED ? i < HOUSED / 2 : i % 2 === 0) ? 'MALE' : 'FEMALE',
    dob: new Date(Date.UTC(2005, 0, 1) + (i % 1000) * DAY_MS),
    className: `CNTT${(i % 5) + 1}`,
    faculty: 'Công nghệ thông tin',
    hometown: 'Hà Nội',
    citizenId: `0012050${String(i + 1).padStart(5, '0')}`,
  })),
});
console.log(`Xếp ${HOUSED} sinh viên vào ở (nộp đơn, duyệt, ký hợp đồng)...`);
const firstTerm = await prisma.registrationPeriod.create({
  data: {
    name: 'Đăng ký học kỳ 1 năm 2026-2027',
    term: '2026-HK1',
    startAt: new Date('2026-08-01T00:00:00+07:00'),
    endAt: new Date('2026-08-31T23:59:59+07:00'),
    stayStartAt: new Date('2026-09-07T00:00:00+07:00'),
    stayEndAt: new Date('2027-01-31T23:59:59+07:00'),
    isOpen: true,
  },
});
const perBuilding = HOUSED / BUILDINGS;
for (const [b, { building, manager }] of buildings.entries()) {
  const beds = await prisma.bed.findMany({
    where: { room: { buildingId: building.id } },
    orderBy: [{ room: { code: 'asc' } }, { code: 'asc' }],
    select: { id: true },
  });
  for (const [j, student] of students.slice(b * perBuilding, (b + 1) * perBuilding).entries()) {
    const registration = await registrationService.create(student, { buildingId: building.id });
    const contract = await registrationService.approve(manager, registration.id, { bedId: beds[j]!.id });
    await contractService.sign(student, contract.id);
  }
}
console.log('Lập hóa đơn, thanh toán, yêu cầu sửa chữa, thông báo...');
await prisma.contract.updateMany({ where: { status: 'ACTIVE' }, data: { signedAt: firstTerm.stayStartAt } });
await roomFeeService.billPendingMonths();
const month = currentMonthVN();
for (const k of [2, 1, 0]) {
  for (const { building, manager } of buildings) {
    const rooms = await prisma.room.findMany({ where: { buildingId: building.id }, select: { id: true } });
    await utilityService.bill(manager, {
      buildingId: building.id,
      period: shiftMonth(month, -k),
      readings: rooms.map(({ id }, i) => ({
        roomId: id,
        electricOld: 1000 + (2 - k) * 300,
        electricNew: 1150 + (2 - k) * 300 + (i % 10) * 10,
        waterOld: 200 + (2 - k) * 30,
        waterNew: 212 + (2 - k) * 30 + (i % 5),
      })),
    });
  }
}
const paid = await prisma.invoice.findMany({ where: { period: { lt: month } }, select: { id: true, amount: true, period: true } });
await prisma.payment.createMany({
  data: paid.map((invoice, i) => ({
    invoiceId: invoice.id,
    amount: invoice.amount,
    status: 'SUCCESS',
    txnRef: randomUUID().replaceAll('-', ''),
    vnpTransactionNo: String(14_600_000 + i),
    vnpResponseCode: '00',
    paidAt: new Date(monthStartVN(invoice.period.slice(0, 7)).getTime() + 3 * DAY_MS),
  })),
});
await prisma.invoice.updateMany({ where: { period: { lt: month } }, data: { status: 'PAID' } });
for (const student of students.slice(0, HOUSED).filter((_, i) => i % 4 === 0)) {
  await maintenanceService.create(student, {
    title: 'Bóng đèn bị cháy',
    description: 'Bóng đèn trong phòng không sáng, nhờ ban quản lý thay giúp.',
  });
}
await prisma.announcement.createMany({
  data: Array.from({ length: 30 }, (_, i) => ({
    title: `Thông báo số ${i + 1}`,
    content: 'Ban quản lý KTX thông báo tới sinh viên đang ở.',
    authorId: admin.id,
    buildingId: i % 3 ? null : buildings[i % BUILDINGS]!.building.id,
    createdAt: new Date(Date.now() - i * DAY_MS),
  })),
});
await prisma.registrationPeriod.update({ where: { id: firstTerm.id }, data: { isOpen: false } });
await prisma.registrationPeriod.create({
  data: {
    name: 'Đăng ký học kỳ 2 năm 2026-2027',
    term: '2026-HK2',
    startAt: new Date('2026-11-15T00:00:00+07:00'),
    endAt: new Date('2026-12-15T23:59:59+07:00'),
    stayStartAt: new Date('2027-02-01T00:00:00+07:00'),
    stayEndAt: new Date('2027-06-30T23:59:59+07:00'),
    isOpen: true,
  },
});
const counts = {
  phong: await prisma.room.count(),
  giuong: await prisma.bed.count(),
  tai_khoan: await prisma.user.count(),
  don: await prisma.registration.count(),
  hop_dong: await prisma.contract.count(),
  hoa_don: await prisma.invoice.count(),
  giao_dich: await prisma.payment.count(),
  sua_chua: await prisma.maintenanceRequest.count(),
  thong_bao: await prisma.announcement.count(),
};
console.log(`Xong ${dbTarget()}: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('; ')}`);
console.log(
  `Mật khẩu mọi tài khoản: "${PASSWORD}". sv0001–sv${String(HOUSED).padStart(4, '0')} đang ở; ` +
    `sv${String(HOUSED + 1).padStart(4, '0')}–sv${HOUSED + APPLICANTS} chưa có chỗ, đợt học kỳ 2 đang mở.`,
);
await prisma.$disconnect();

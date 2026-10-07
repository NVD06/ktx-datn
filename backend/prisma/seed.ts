import 'dotenv/config';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { bedCodes } from '../src/modules/beds/bed-code.js';
import * as contractService from '../src/modules/contracts/contract.service.js';
import * as hygieneService from '../src/modules/hygiene/hygiene.service.js';
import * as roomFeeService from '../src/modules/invoices/room-fee.service.js';
import * as utilityService from '../src/modules/invoices/utility.service.js';
import * as maintenanceService from '../src/modules/maintenance/maintenance.service.js';
import * as registrationService from '../src/modules/registrations/registration.service.js';
import { currentMonthVN } from '../src/utils/date-vn.js';
import { dbTarget, isLocalDatabase } from './db-target.js';

/**
 * Dữ liệu mẫu — phạm vi US-00 → US-05.
 *
 *   - 3 vai trò để test điều hướng sau login
 *   - 2 tòa nhà để test buildingScope() (Manager tòa B1 không đọc được B2)
 *   - 2 loại phòng (danh mục dùng chung)
 *   - Phòng + giường cho cả 2 tòa; B1 có > 20 phòng để test phân trang
 *   - Đơn, hợp đồng, hóa đơn tiền phòng + điện nước đủ các trạng thái để demo
 *   - Yêu cầu sửa chữa đủ các trạng thái, điểm vệ sinh hằng tuần có lần dưới 60 điểm
 *
 * Thống kê (US-06) dùng lại dữ liệu trên, bổ sung vào file này nếu cần.
 *
 * Chạy lại được nhiều lần: xóa sạch dữ liệu cũ trước khi tạo mới.
 * KHÔNG chạy trên môi trường có dữ liệu thật — `assertDevDatabase` chặn cứng.
 */

const PASSWORD = '123456';

/** Thứ tự xử lý một yêu cầu sửa chữa khi không bị từ chối. */
const REQUEST_FLOW = ['RECEIVED', 'DONE', 'CONFIRMED'] as const;
type RequestStatus = 'PENDING' | (typeof REQUEST_FLOW)[number];

async function clearAll() {
  // Xóa theo thứ tự ngược với phụ thuộc khóa ngoại.
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.registrationPeriod.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.hygieneRecord.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.building.deleteMany();
}

/**
 * Chỉ cho seed chạy trên database ở máy dev, và không ở chế độ production. Bản deploy (Neon) dùng
 * dữ liệu thật: Admin đầu tiên tạo bằng `npm run create-admin`, phần còn lại nhập qua giao diện.
 * Chặn cả khi gọi gián tiếp — `prisma migrate reset` tự chạy seed sau khi xóa database.
 */
function assertDevDatabase() {
  if (env.NODE_ENV !== 'production' && isLocalDatabase()) return;
  console.error(`
Không chạy seed: seed xóa sạch dữ liệu, chỉ dùng cho database ở máy dev.
  Database: ${dbTarget()} · NODE_ENV=${env.NODE_ENV}
  Database dữ liệu thật: tạo Admin đầu tiên bằng "npm run create-admin".
`);
  process.exit(1);
}

async function main() {
  assertDevDatabase();
  console.log('Xóa dữ liệu cũ...');
  await clearAll();

  const passwordHash = await hashPassword(PASSWORD);

  // ── Tòa nhà ───────────────────────────────────────────────────────────────
  // Cần 2 tòa để kiểm chứng phân quyền theo phạm vi: Manager của tòa này
  // không được đọc/sửa dữ liệu của tòa kia.
  console.log('Tạo tòa nhà...');

  const b1 = await prisma.building.create({
    data: { name: 'B1', floors: 3, gender: 'MALE', description: 'Tòa nam' },
  });
  const b2 = await prisma.building.create({
    data: { name: 'B2', floors: 3, gender: 'FEMALE', description: 'Tòa nữ' },
  });

  // ── Loại phòng ────────────────────────────────────────────────────────────
  // Danh mục dùng chung toàn hệ thống (không gắn theo tòa). Seed sẵn vì US-01
  // cần có ít nhất một loại phòng thì mới tạo được phòng qua giao diện.
  console.log('Tạo loại phòng...');

  const roomTypes = await Promise.all([
    prisma.roomType.create({
      data: {
        name: 'Phòng 4 giường - điều hòa',
        capacity: 4,
        price: 500_000, // đ/tháng/sinh viên
        description: 'Phòng khép kín, điều hòa, 4 giường tầng',
      },
    }),
    prisma.roomType.create({
      data: {
        name: 'Phòng 8 giường - quạt',
        capacity: 8,
        price: 250_000,
        description: 'Phòng khép kín, quạt trần, 8 giường tầng',
      },
    }),
  ]);

  // ── Phòng & giường (US-01) ────────────────────────────────────────────────
  // Giường sinh đủ theo sức chứa loại phòng, giống hệt khi tạo phòng qua API.
  // Chưa có giường OCCUPIED: trạng thái đó chỉ xuất hiện cùng hợp đồng (US-03).
  console.log('Tạo phòng và giường...');

  const [type4, type8] = roomTypes;
  const roomPlan = [
    { building: b1, roomsPerFloor: 8 }, // 24 phòng — vượt 1 trang (20 dòng)
    { building: b2, roomsPerFloor: 5 }, // 15 phòng
  ];

  let roomCount = 0;
  let bedCount = 0;
  for (const { building, roomsPerFloor } of roomPlan) {
    for (let floor = 1; floor <= building.floors; floor++) {
      for (let n = 1; n <= roomsPerFloor; n++) {
        // 2 phòng đầu mỗi tầng là phòng 8 giường quạt, còn lại 4 giường điều hòa.
        const roomType = n <= 2 ? type8 : type4;
        await prisma.room.create({
          data: {
            buildingId: building.id,
            roomTypeId: roomType.id,
            code: `${floor}${String(n).padStart(2, '0')}`,
            floor,
            beds: { create: bedCodes(roomType.capacity).map((code) => ({ code })) },
          },
        });
        roomCount++;
        bedCount += roomType.capacity;
      }
    }
  }

  // Vài trạng thái đặc biệt để giao diện có đủ màu:
  //   B1-105: 1 giường bảo trì, phòng vẫn còn chỗ
  //   B1-305: cả phòng bảo trì
  //   B2-205: phòng ngừng hoạt động
  await prisma.bed.updateMany({
    where: { code: 'G4', room: { buildingId: b1.id, code: '105' } },
    data: { status: 'MAINTENANCE' },
  });
  await prisma.bed.updateMany({
    where: { room: { buildingId: b1.id, code: '305' } },
    data: { status: 'MAINTENANCE' },
  });
  await prisma.room.updateMany({
    where: { buildingId: b2.id, code: '205' },
    data: { isActive: false },
  });

  // ── Tài khoản ─────────────────────────────────────────────────────────────
  console.log('Tạo tài khoản...');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ktx.edu.vn',
      passwordHash,
      fullName: 'Quản trị viên',
      phone: '0900000001',
      role: 'ADMIN',
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@ktx.edu.vn',
      passwordHash,
      fullName: 'Nguyễn Văn Quản',
      phone: '0900000002',
      role: 'MANAGER',
      buildingId: b1.id,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@ktx.edu.vn',
      passwordHash,
      fullName: 'Trần Thị Lý',
      phone: '0900000003',
      role: 'MANAGER',
      buildingId: b2.id,
    },
  });

  // 8 sinh viên: 4 nam, 4 nữ — đủ để test lọc theo giới tính ở US-02 và các tình huống ở US-03/04.
  // sv004 cố ý thiếu ngày sinh + CCCD để demo chặn nộp đơn khi hồ sơ chưa đủ (US-02.3).
  const studentSeed = [
    { code: '001', name: 'Lê Minh An', gender: 'MALE' as const, complete: true },
    { code: '002', name: 'Phạm Quốc Bảo', gender: 'MALE' as const, complete: true },
    { code: '003', name: 'Ngô Thu Cúc', gender: 'FEMALE' as const, complete: true },
    { code: '004', name: 'Đỗ Hải Duyên', gender: 'FEMALE' as const, complete: false },
    { code: '005', name: 'Vũ Đức Hải', gender: 'MALE' as const, complete: true },
    { code: '006', name: 'Hoàng Gia Huy', gender: 'MALE' as const, complete: true },
    { code: '007', name: 'Bùi Lan Hương', gender: 'FEMALE' as const, complete: true },
    { code: '008', name: 'Trịnh Mai Khanh', gender: 'FEMALE' as const, complete: true },
  ];

  for (const s of studentSeed) {
    await prisma.user.create({
      data: {
        email: `sv${s.code}@ktx.edu.vn`,
        passwordHash,
        fullName: s.name,
        phone: `09111${s.code}00`,
        role: 'STUDENT',
        profile: {
          create: {
            studentCode: `SV${s.code}`,
            gender: s.gender,
            className: 'CNTT1',
            faculty: 'Công nghệ thông tin',
            hometown: 'Hà Nội',
            ...(s.complete
              ? { dob: new Date('2005-01-15T00:00:00+07:00'), citizenId: `001205000${s.code}` }
              : {}),
          },
        },
      },
    });
  }

  // Đợt cũ đã đóng + đợt hiện tại đang mở — US-02 nộp đơn được ngay sau khi seed.
  await prisma.registrationPeriod.create({
    data: {
      name: 'Đăng ký học kỳ 2 năm 2025-2026',
      term: '2025-HK2',
      startAt: new Date('2026-01-05T00:00:00+07:00'),
      endAt: new Date('2026-01-31T23:59:59+07:00'),
      stayStartAt: new Date('2026-02-02T00:00:00+07:00'),
      stayEndAt: new Date('2026-06-30T23:59:59+07:00'),
      isOpen: false,
    },
  });
  const openPeriod = await prisma.registrationPeriod.create({
    data: {
      name: 'Đăng ký học kỳ 1 năm 2026-2027',
      term: '2026-HK1',
      startAt: new Date('2026-09-01T00:00:00+07:00'),
      endAt: new Date('2026-10-15T23:59:59+07:00'),
      stayStartAt: new Date('2026-09-07T00:00:00+07:00'),
      stayEndAt: new Date('2027-01-31T23:59:59+07:00'),
      isOpen: true,
    },
  });

  // ── Đơn, hợp đồng, hóa đơn (US-02 → US-04) ─────────────────────────────────
  // Đi qua đúng các service như khi bấm trên giao diện, để dữ liệu mẫu tuân theo mọi
  // quy tắc nghiệp vụ: mã HD/INV, giữ giường, snapshot giá, chia tiền điện nước.
  console.log('Tạo đơn, hợp đồng, hóa đơn...');

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, buildingId: true },
  });
  const as = (email: string) => users.find((u) => u.email === email)!;
  const sv = (code: string) => as(`sv${code}@ktx.edu.vn`);
  const m1 = as(manager1.email);
  const m2 = as(manager2.email);
  const roomId = async (building: { id: string }, code: string) =>
    (await prisma.room.findFirstOrThrow({ where: { buildingId: building.id, code }, select: { id: true } })).id;

  /** Nộp đơn → Manager duyệt vào giường `bedCode` phòng `room` → (tùy chọn) SV ký. */
  async function house(
    student: string,
    manager: typeof m1,
    building: { id: string },
    room: string,
    bedCode: string,
    sign: boolean,
  ) {
    const registration = await registrationService.create(sv(student), { buildingId: building.id });
    const bed = await prisma.bed.findFirstOrThrow({ where: { code: bedCode, room: { buildingId: building.id, code: room } } });
    const contract = await registrationService.approve(manager, registration.id, { bedId: bed.id });
    if (sign) await contractService.sign(sv(student), contract.id);
    return contract;
  }

  const anContract = await house('001', m1, b1, '103', 'G1', true); // đang ở
  await house('002', m1, b1, '103', 'G2', true); // đang ở, cùng phòng
  await house('005', m1, b1, '103', 'G3', false); // đã duyệt, chờ ký → giường "Giữ chỗ"
  await house('003', m2, b2, '103', 'G1', true);
  // Seed chạy giữa kỳ: coi như SV đã ký từ ngày đầu kỳ. Lúc ký mới có hóa đơn tháng này; lập bù
  // những tháng đã ở từ đầu kỳ tới giờ, như server tự làm lúc khởi động.
  await prisma.contract.updateMany({ where: { status: 'ACTIVE' }, data: { signedAt: openPeriod.stayStartAt } });
  await roomFeeService.billPendingMonths();
  await registrationService.create(sv('006'), { buildingId: b1.id }); // chờ duyệt
  await registrationService.create(sv('007'), {}); // chờ duyệt, tòa nào cũng được → Manager B2 thấy
  const rejected = await registrationService.create(sv('008'), { buildingId: b2.id });
  await registrationService.reject(m2, rejected.id, {
    reviewNote: 'Tòa B2 đã hết phòng 4 giường điều hòa, mời bạn đăng ký đợt sau.',
  });

  // Điện nước tháng này của hai phòng 103. sv005 chưa ký nên chưa chia tiền.
  const period = currentMonthVN();
  await utilityService.bill(m1, {
    buildingId: b1.id,
    period,
    readings: [{ roomId: await roomId(b1, '103'), electricOld: 1200, electricNew: 1350, waterOld: 300, waterNew: 312 }],
  });
  await utilityService.bill(m2, {
    buildingId: b2.id,
    period,
    readings: [{ roomId: await roomId(b2, '103'), electricOld: 800, electricNew: 880, waterOld: 150, waterNew: 156 }],
  });

  // Một hóa đơn quá hạn để giao diện có đủ trạng thái (badge "Quá hạn", banner của SV).
  await prisma.invoice.updateMany({
    where: { contractId: anContract.id, type: 'UTILITY' },
    data: { dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  });

  // ── Sửa chữa (US-05) ───────────────────────────────────────────────────────
  console.log('Tạo yêu cầu sửa chữa...');

  /** Gửi yêu cầu rồi đi lần lượt tới `until` qua service — có mốc thời gian, người xử lý như thật. */
  async function request(student: string, manager: typeof m1, title: string, description: string, until: RequestStatus) {
    const created = await maintenanceService.create(sv(student), { title, description });
    const steps = until === 'PENDING' ? [] : REQUEST_FLOW.slice(0, REQUEST_FLOW.indexOf(until) + 1);
    for (const status of steps) {
      if (status === 'CONFIRMED') await maintenanceService.confirm(sv(student), created.id);
      else await maintenanceService.updateStatus(manager, created.id, { status });
    }
    return created;
  }
  await request('001', m1, 'Bóng đèn nhà vệ sinh bị cháy', 'Bóng đèn trong nhà vệ sinh không sáng từ tối qua.', 'CONFIRMED');
  await request('001', m1, 'Quạt trần kêu to', 'Quạt trần phòng 103 kêu lạch cạch khi bật số 3.', 'RECEIVED');
  await request('002', m1, 'Khóa tủ cá nhân bị kẹt', 'Tủ giường G2 không mở được khóa.', 'DONE'); // chờ SV xác nhận
  await request('002', m1, 'Vòi nước bồn rửa bị rỉ', 'Vòi bồn rửa nhỏ giọt liên tục kể cả khi đã khóa chặt.', 'PENDING');
  await request('003', m2, 'Rèm cửa sổ bị rách', 'Rèm cửa sổ phía giường G1 rách một đoạn dài.', 'RECEIVED');
  const socket = await request('003', m2, 'Xin lắp thêm ổ cắm', 'Phòng thiếu ổ cắm, xin lắp thêm một ổ ở bàn học.', 'PENDING');
  await maintenanceService.updateStatus(m2, socket.id, {
    status: 'REJECTED',
    assigneeNote: 'Không lắp thêm ổ cắm vì quy định phòng cháy; dùng ổ chung cạnh cửa ra vào.',
  });

  // ── Vệ sinh (US-05) ────────────────────────────────────────────────────────
  console.log('Chấm điểm vệ sinh...');

  /** Mỗi tuần một đợt kiểm tra, đợt cuối là hôm nay — qua service để có người chấm như thật. */
  async function hygiene(manager: typeof m1, building: { id: string }, room: string, weeks: [number, number, string?][]) {
    const id = await roomId(building, room);
    for (const [i, [score, deduction, note]] of weeks.entries()) {
      await hygieneService.save(manager, {
        buildingId: building.id,
        checkDate: new Date(Date.now() - (weeks.length - 1 - i) * 7 * 24 * 60 * 60 * 1000),
        records: [{ roomId: id, score, deduction, note: note ?? null }],
      });
    }
  }
  await hygiene(m1, b1, '103', [[85, 0], [55, 20, 'Để rác qua đêm, giày dép ngoài hành lang'], [72, 5, 'Còn để giày dép ngoài hành lang'], [90, 0]]);
  await hygiene(m2, b2, '103', [[88, 0], [92, 0], [86, 0], [58, 15, 'Không đổ rác, nhà vệ sinh bẩn']]); // lần gần nhất dưới 60

  const [contractCount, roomFeeCount, utilityCount] = await Promise.all([
    prisma.contract.count(),
    prisma.invoice.count({ where: { type: 'ROOM_FEE' } }),
    prisma.invoice.count({ where: { type: 'UTILITY' } }),
  ]);

  console.log(`
Seed xong (phạm vi US-00 → US-05):
  Tòa nhà    : 2  (${b1.name} nam, ${b2.name} nữ)
  Loại phòng : ${roomTypes.length}  (${roomTypes.map((t) => t.name).join(', ')})
  Phòng      : ${roomCount}  (${bedCount} giường)
  Đợt đăng ký: 2  (đang mở: ${openPeriod.name})
  Tài khoản  : ${3 + studentSeed.length}  (1 admin, 2 manager, ${studentSeed.length} sinh viên)
  Hợp đồng   : ${contractCount}  (3 đang ở, 1 chờ ký)
  Hóa đơn    : ${roomFeeCount} tiền phòng (trả trước, từ đầu kỳ tới tháng này) + ${utilityCount} điện nước (1 quá hạn)
  Đơn        : 2 chờ duyệt (sv006, sv007), 1 bị từ chối (sv008)
  Sửa chữa   : 6 yêu cầu đủ trạng thái (sv001, sv002 tòa ${b1.name}; sv003 tòa ${b2.name})
  Vệ sinh    : 4 đợt hằng tuần phòng 103 mỗi tòa, 2 lần dưới 60 điểm (${b2.name}-103 ngay đợt hôm nay)

Đăng nhập bằng mật khẩu "${PASSWORD}":
  ${admin.email}       → ADMIN
  ${manager1.email}    → MANAGER (tòa ${b1.name})
  ${manager2.email}    → MANAGER (tòa ${b2.name})
  sv001@ktx.edu.vn … sv008@ktx.edu.vn  → STUDENT (sv004 hồ sơ chưa đủ)
`);
}

main()
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

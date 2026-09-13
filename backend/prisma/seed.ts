import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';
import { bedCodes } from '../src/modules/beds/bed-code.js';

/**
 * Dữ liệu mẫu — phạm vi US-00 + US-01.
 *
 *   - 3 vai trò để test điều hướng sau login
 *   - 2 tòa nhà để test buildingScope() (Manager tòa B1 không đọc được B2)
 *   - 2 loại phòng (danh mục dùng chung)
 *   - Phòng + giường cho cả 2 tòa; B1 có > 20 phòng để test phân trang
 *
 * Hợp đồng, hóa đơn... bổ sung vào file này khi tới các user story tương ứng.
 *
 * Chạy lại được nhiều lần: xóa sạch dữ liệu cũ trước khi tạo mới.
 * KHÔNG chạy trên môi trường có dữ liệu thật.
 */

const PASSWORD = '123456';

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

async function main() {
  console.log('Xóa dữ liệu cũ...');
  await clearAll();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

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
        price: 1_500_000,
        description: 'Phòng khép kín, điều hòa, 4 giường tầng',
      },
    }),
    prisma.roomType.create({
      data: {
        name: 'Phòng 8 giường - quạt',
        capacity: 8,
        price: 900_000,
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

  // 4 sinh viên: 2 nam, 2 nữ — đủ để test lọc theo giới tính ở US-02
  const studentSeed = [
    { code: '001', name: 'Lê Minh An', gender: 'MALE' as const },
    { code: '002', name: 'Phạm Quốc Bảo', gender: 'MALE' as const },
    { code: '003', name: 'Ngô Thu Cúc', gender: 'FEMALE' as const },
    { code: '004', name: 'Đỗ Hải Duyên', gender: 'FEMALE' as const },
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
          },
        },
      },
    });
  }

  console.log(`
Seed xong (phạm vi US-00 + US-01):
  Tòa nhà    : 2  (${b1.name} nam, ${b2.name} nữ)
  Loại phòng : ${roomTypes.length}  (${roomTypes.map((t) => t.name).join(', ')})
  Phòng      : ${roomCount}  (${bedCount} giường)
  Tài khoản  : ${3 + studentSeed.length}  (1 admin, 2 manager, ${studentSeed.length} sinh viên)

Đăng nhập bằng mật khẩu "${PASSWORD}":
  ${admin.email}       → ADMIN
  ${manager1.email}    → MANAGER (tòa ${b1.name})
  ${manager2.email}    → MANAGER (tòa ${b2.name})
  sv001@ktx.edu.vn … sv004@ktx.edu.vn  → STUDENT
`);
}

main()
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

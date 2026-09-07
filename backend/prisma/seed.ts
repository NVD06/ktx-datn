import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';

/**
 * Dữ liệu mẫu — phạm vi US-00 (nền tảng + xác thực).
 *
 * Chỉ tạo đủ để kiểm tra đăng nhập và phân quyền:
 *   - 3 vai trò để test điều hướng sau login
 *   - 2 tòa nhà để test buildingScope() (Manager tòa B1 không đọc được B2)
 *
 * Phòng, giường, hợp đồng, hóa đơn... sẽ được tạo qua giao diện ở US-01 trở đi,
 * và bổ sung vào file này khi tới các user story tương ứng.
 *
 * Chạy lại được nhiều lần: xóa sạch dữ liệu cũ trước khi tạo mới.
 * KHÔNG chạy trên môi trường có dữ liệu thật.
 */

const PASSWORD = '123456';

async function clearAll() {
  // Xóa theo thứ tự ngược với phụ thuộc khóa ngoại.
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.registrationPeriod.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.hygieneRecord.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
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
Seed xong (phạm vi US-00):
  Tòa nhà   : 2  (${b1.name} nam, ${b2.name} nữ — chưa có phòng)
  Tài khoản : ${3 + studentSeed.length}  (1 admin, 2 manager, ${studentSeed.length} sinh viên)

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

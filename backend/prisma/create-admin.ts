import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { emailSchema, fullNameSchema } from '../src/utils/zod-fields.js';
import { dbTarget } from './db-target.js';

/**
 * Tạo tài khoản Admin đầu tiên cho database dữ liệu thật — đúng một tài khoản, không kèm dữ liệu
 * mẫu và không xóa gì như seed. Đăng nhập rồi nhập tiếp qua giao diện: tòa nhà, loại phòng, phòng,
 * tài khoản Manager, tài khoản sinh viên (từng người hoặc nhập Excel), đợt đăng ký.
 *
 *   Database trong .env (máy dev):
 *     npm run create-admin -- admin@ktx.edu.vn "Nguyễn Văn A"
 *   Database bản deploy (Neon) — tự tạo .env.production ở máy, gồm DATABASE_URL của Neon,
 *   AUTH_SECRET và NODE_ENV=production (file nằm trong .gitignore):
 *     npx tsx --env-file=.env.production prisma/create-admin.ts admin@ktx.edu.vn "Nguyễn Văn A"
 *
 * Chỉ tạo mới, không sửa tài khoản đã có. Bỏ trống họ tên thì lấy "Quản trị viên".
 */

const PASSWORD = '123456';

async function main() {
  const [rawEmail, rawName = 'Quản trị viên'] = process.argv.slice(2);
  const email = emailSchema.safeParse(rawEmail ?? '');
  const fullName = fullNameSchema.safeParse(rawName);
  if (!email.success || !fullName.success) {
    console.error('Cách dùng: npm run create-admin -- <email> ["Họ tên"]');
    for (const issue of [...(email.error?.issues ?? []), ...(fullName.error?.issues ?? [])]) {
      console.error(`  - ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Database: ${dbTarget()}`);
  const existing = await prisma.user.findUnique({ where: { email: email.data }, select: { role: true } });
  if (existing) {
    console.error(
      existing.role === 'ADMIN'
        ? `${email.data} đã là tài khoản Admin, không tạo lại.`
        : `${email.data} đang là tài khoản ${existing.role}, hãy dùng email khác.`,
    );
    process.exitCode = 1;
    return;
  }

  await prisma.user.create({
    data: {
      email: email.data,
      fullName: fullName.data,
      role: 'ADMIN',
      passwordHash: await hashPassword(PASSWORD),
      mustChangePassword: true,
    },
  });
  console.log(`Đã tạo Admin ${fullName.data} <${email.data}>, mật khẩu "${PASSWORD}" — phải đổi ở lần đăng nhập đầu.`);
}

main()
  .catch((e) => {
    console.error('Tạo Admin thất bại:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

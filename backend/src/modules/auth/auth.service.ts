import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import type { RegisterInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 10;

/** Băm mật khẩu trước khi lưu — dùng chung cho SV tự đăng ký và Admin tạo Manager. */
export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Đăng ký tài khoản sinh viên.
 *
 * Auth.js không xử lý đăng ký — phần này tự viết. Vai trò luôn là STUDENT và
 * không nhận từ client: nếu để client gửi `role` lên thì ai cũng tự tạo được
 * tài khoản ADMIN.
 */
export async function register(input: RegisterInput) {
  const [emailTaken, codeTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.studentProfile.findUnique({
      where: { studentCode: input.studentCode },
      select: { id: true },
    }),
  ]);

  if (emailTaken) throw ApiError.conflict('EMAIL_TAKEN', 'Email này đã được đăng ký');
  if (codeTaken) throw ApiError.conflict('STUDENT_CODE_TAKEN', 'Mã sinh viên này đã tồn tại');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      ...(input.phone ? { phone: input.phone } : {}),
      role: 'STUDENT',
      profile: {
        create: {
          studentCode: input.studentCode,
          gender: input.gender,
          ...(input.className ? { className: input.className } : {}),
          ...(input.faculty ? { faculty: input.faculty } : {}),
        },
      },
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  return user;
}

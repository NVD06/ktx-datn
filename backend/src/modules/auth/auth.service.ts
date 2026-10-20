import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import type { AuthUser } from '../../types/auth-user.js';
import type { ChangePasswordInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 10;

/** Băm mật khẩu trước khi lưu — Admin tạo tài khoản, đổi mật khẩu, lệnh create-admin, seed. */
export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Đổi mật khẩu — tự đổi, hoặc lần đầu bắt buộc khi đang dùng mật khẩu ban đầu do Admin
 * cấp. Mật khẩu mới phải khác mật khẩu hiện tại; với sinh viên cũng không được là mã SV,
 * vì đó chính là mật khẩu ban đầu mà ai biết mã SV cũng đoán được.
 */
export async function changePassword(user: AuthUser, { currentPassword, newPassword }: ChangePasswordInput) {
  const { passwordHash, profile } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, profile: { select: { studentCode: true } } },
  });
  if (!(await bcrypt.compare(currentPassword, passwordHash))) {
    throw ApiError.validation({ currentPassword: ['Mật khẩu hiện tại không đúng'] });
  }
  if (newPassword === currentPassword) {
    throw ApiError.validation({ newPassword: ['Mật khẩu mới phải khác mật khẩu hiện tại'] });
  }
  if (newPassword === profile?.studentCode) {
    throw ApiError.validation({ newPassword: ['Không dùng mã sinh viên làm mật khẩu'] });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false, passwordChangedAt: new Date() },
  });
  return { ...user, mustChangePassword: false };
}

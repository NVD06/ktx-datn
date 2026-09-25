import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import type { UpdateProfileInput } from './profile.schema.js';

/*
 * Hồ sơ của chính sinh viên đang đăng nhập — luôn lọc theo `user.id`, không
 * nhận id từ URL nên không thể đọc/sửa hồ sơ người khác.
 */

/**
 * Các trường bắt buộc có trước khi nộp đơn đăng ký ở (US-02.3) — đủ để Manager
 * liên hệ và lập hợp đồng. Muốn nới/siết điều kiện thì chỉ sửa ở đây.
 */
const REQUIRED_FIELDS = {
  phone: 'Số điện thoại',
  dob: 'Ngày sinh',
  className: 'Lớp',
  faculty: 'Khoa',
  hometown: 'Quê quán',
  citizenId: 'Số CCCD',
} as const;

type RequiredField = keyof typeof REQUIRED_FIELDS;

/** Thông tin liên hệ + hồ sơ sinh viên — danh sách đơn của người duyệt (US-02.4) dùng lại. */
export const STUDENT_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  profile: { omit: { id: true, userId: true } },
} as const satisfies Prisma.UserSelect;

/** Tìm sinh viên theo tên, email hoặc mã SV — dùng chung cho bảng đơn và bảng hợp đồng. */
export function studentSearch(q: string): Prisma.UserWhereInput {
  const contains = { contains: q, mode: 'insensitive' } as const;
  return { OR: [{ fullName: contains }, { email: contains }, { profile: { studentCode: contains } }] };
}

type UserRow = Prisma.UserGetPayload<{ select: typeof STUDENT_SELECT }>;

function toDto({ profile, ...user }: UserRow) {
  if (!profile) {
    throw ApiError.notFound('Tài khoản chưa có hồ sơ sinh viên, hãy liên hệ quản trị viên');
  }
  const values = { ...profile, phone: user.phone };
  const missingFields = (Object.keys(REQUIRED_FIELDS) as RequiredField[]).filter((f) => !values[f]);
  return { ...user, ...profile, isComplete: missingFields.length === 0, missingFields };
}

/** `db` cho phép đọc trong transaction của service khác (nộp đơn). */
export async function get(user: AuthUser, db: Prisma.TransactionClient = prisma) {
  return toDto(await db.user.findUniqueOrThrow({ where: { id: user.id }, select: STUDENT_SELECT }));
}

export async function update(user: AuthUser, { phone, ...profile }: UpdateProfileInput) {
  // Chưa có StudentProfile thì nested update ném P2025 -> 404 ở error-handler.
  const row = await prisma.user.update({
    where: { id: user.id },
    data: { ...(phone !== undefined ? { phone } : {}), profile: { update: profile } },
    select: STUDENT_SELECT,
  });
  return toDto(row);
}

/**
 * Chặn nộp đơn khi hồ sơ còn thiếu — 409 kèm tên các trường cần bổ sung.
 * Trả về hồ sơ để service đăng ký kiểm tra giới tính với nguyện vọng tòa.
 */
export async function assertComplete(user: AuthUser, db: Prisma.TransactionClient = prisma) {
  const profile = await get(user, db);
  if (!profile.isComplete) {
    const labels = profile.missingFields.map((f) => REQUIRED_FIELDS[f]).join(', ');
    throw ApiError.conflict(
      'PROFILE_INCOMPLETE',
      `Bạn cần hoàn thiện hồ sơ trước khi nộp đơn. Còn thiếu: ${labels}.`,
    );
  }
  return profile;
}

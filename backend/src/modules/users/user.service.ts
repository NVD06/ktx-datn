import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { hashPassword } from '../auth/auth.service.js';
import type { CreateManagerInput, UpdateUserInput, UserListQuery } from './user.schema.js';

// Liệt kê tường minh từng cột: `passwordHash` không bao giờ được rời khỏi service.
const SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  buildingId: true,
  building: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export async function list(query: UserListQuery) {
  const where: Prisma.UserWhereInput = {
    AND: [
      query.role ? { role: query.role } : {},
      query.buildingId ? { buildingId: query.buildingId } : {},
      query.isActive !== undefined ? { isActive: query.isActive } : {},
      query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  return paginate(
    query,
    { sortable: ['fullName', 'email', 'createdAt'] },
    (page) => prisma.user.findMany({ where, ...page, select: SELECT }),
    () => prisma.user.count({ where }),
  );
}

/**
 * Tòa gán được cho quản lý `userId` (null khi tạo mới): tồn tại, đang hoạt động và
 * chưa có quản lý khác. Manager ↔ tòa là quan hệ 1–1 — tòa đã có người thì phải
 * gỡ người cũ trước, không tự thay thế sau lưng Admin. Hai Admin cùng gán vào một
 * tòa trống thì unique index User.buildingId chặn người ghi sau (error-handler trả 409).
 */
async function assertBuildingAssignable(buildingId: string, userId: string | null) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { name: true, isActive: true, manager: { select: { id: true, fullName: true } } },
  });
  if (!building) {
    const message = 'Tòa nhà không tồn tại';
    throw ApiError.badRequest('BUILDING_NOT_FOUND', message, { buildingId: [message] });
  }
  if (!building.isActive) {
    throw ApiError.conflict(
      'BUILDING_INACTIVE',
      `Tòa nhà ${building.name} đang ngừng hoạt động, không thể gán quản lý`,
    );
  }
  // Gán lại đúng người đang quản lý thì không có gì thay đổi — cho qua.
  if (building.manager && building.manager.id !== userId) {
    throw ApiError.conflict(
      'BUILDING_HAS_MANAGER',
      `Tòa nhà ${building.name} đang do ${building.manager.fullName} quản lý. Hãy gỡ người này khỏi tòa trước khi gán người khác.`,
    );
  }
}

/**
 * Admin tạo tài khoản quản lý (US-01.6). Vai trò luôn là MANAGER, không nhận từ
 * client; không có đường tạo thêm ADMIN, sinh viên vẫn tự đăng ký.
 */
export async function createManager({ password, ...input }: CreateManagerInput) {
  const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken) throw ApiError.conflict('EMAIL_TAKEN', 'Email này đã được dùng cho tài khoản khác');
  if (input.buildingId) await assertBuildingAssignable(input.buildingId, null);

  return prisma.user.create({
    data: { ...input, passwordHash: await hashPassword(password), role: 'MANAGER' },
    select: SELECT,
  });
}

/**
 * Admin gán/gỡ tòa cho quản lý (US-01) và khóa/mở khóa tài khoản (US-01.6). Khóa
 * có hiệu lực ngay từ request kế tiếp: requireAuth đọc `isActive` từ DB mỗi request.
 */
export async function update(actor: AuthUser, id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true, fullName: true },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  if (input.isActive === false && id === actor.id) {
    throw ApiError.conflict('CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của chính mình');
  }

  if (input.buildingId !== undefined) {
    if (user.role !== 'MANAGER') {
      throw ApiError.conflict('USER_NOT_MANAGER', 'Chỉ tài khoản quản lý mới được gán tòa nhà');
    }
    // Gỡ (null) thì vẫn cho, để dọn tòa của tài khoản đã khóa.
    if (input.buildingId !== null) {
      if (!(input.isActive ?? user.isActive)) {
        throw ApiError.conflict(
          'USER_INACTIVE',
          `Tài khoản ${user.fullName} đang bị khóa, không thể gán vào tòa nhà`,
        );
      }
      await assertBuildingAssignable(input.buildingId, id);
    }
  }

  return prisma.user.update({ where: { id }, data: input, select: SELECT });
}

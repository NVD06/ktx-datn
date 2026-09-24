import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { isUniqueViolation } from '../../utils/prisma-error.js';
import type { UpdateUserInput, UserListQuery } from './user.schema.js';

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

function buildingHasManagerError(buildingName: string, managerName: string) {
  return ApiError.conflict(
    'BUILDING_HAS_MANAGER',
    `Tòa nhà ${buildingName} đang do ${managerName} quản lý. Hãy gỡ người này khỏi tòa trước khi gán người khác.`,
  );
}

/**
 * Hiện chỉ dùng để gán Manager vào tòa (US-01). Manager ↔ tòa là quan hệ 1–1:
 * mỗi Manager thuộc đúng một tòa (gán sang tòa khác là chuyển, không cộng dồn),
 * và mỗi tòa có tối đa một Manager — tòa đã có người thì phải gỡ người cũ trước,
 * không tự thay thế sau lưng Admin.
 */
export async function update(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true, fullName: true },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  if (input.buildingId !== undefined) {
    if (user.role !== 'MANAGER') {
      throw ApiError.conflict('USER_NOT_MANAGER', 'Chỉ tài khoản quản lý mới được gán tòa nhà');
    }

    if (input.buildingId !== null) {
      // Gỡ (null) thì vẫn cho, để dọn tòa của tài khoản đã khóa.
      if (!user.isActive) {
        throw ApiError.conflict(
          'USER_INACTIVE',
          `Tài khoản ${user.fullName} đang bị khóa, không thể gán vào tòa nhà`,
        );
      }

      const building = await prisma.building.findUnique({
        where: { id: input.buildingId },
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
      if (building.manager && building.manager.id !== id) {
        throw buildingHasManagerError(building.name, building.manager.fullName);
      }
    }
  }

  try {
    return await prisma.user.update({ where: { id }, data: input, select: SELECT });
  } catch (err) {
    // Hai Admin cùng gán hai người vào một tòa đang trống: cả hai lọt qua kiểm
    // tra ở trên, unique index của User.buildingId chặn người ghi sau.
    if (isUniqueViolation(err, 'User_buildingId_key')) {
      throw ApiError.conflict(
        'BUILDING_HAS_MANAGER',
        'Tòa nhà vừa được gán cho quản lý khác. Hãy tải lại để xem ai đang quản lý.',
      );
    }
    throw err;
  }
}

import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
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

/**
 * Hiện chỉ dùng để gán Manager vào tòa (US-01). Mỗi Manager thuộc đúng một tòa
 * (`User.buildingId`) — đổi tòa là ghi đè, không cộng dồn.
 */
export async function update(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  if (input.buildingId !== undefined) {
    if (user.role !== 'MANAGER') {
      throw ApiError.conflict('USER_NOT_MANAGER', 'Chỉ tài khoản quản lý mới được gán tòa nhà');
    }

    if (input.buildingId !== null) {
      const building = await prisma.building.findUnique({
        where: { id: input.buildingId },
        select: { name: true, isActive: true },
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
    }
  }

  return prisma.user.update({ where: { id }, data: input, select: SELECT });
}

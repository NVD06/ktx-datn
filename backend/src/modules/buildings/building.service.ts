import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { outOfScope, ownBuildingScope } from '../../utils/scope.js';
import type {
  BuildingListQuery,
  CreateBuildingInput,
  UpdateBuildingInput,
} from './building.schema.js';

const INCLUDE = {
  managers: { select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } },
  _count: { select: { rooms: true } },
} as const satisfies Prisma.BuildingInclude;

type BuildingRow = Prisma.BuildingGetPayload<{ include: typeof INCLUDE }>;

function toDto({ _count, ...building }: BuildingRow) {
  return { ...building, roomCount: _count.rooms };
}

/**
 * Danh sách tòa nhà.
 *
 * Phạm vi quyền nằm ngay trong `where`: Admin thấy tất cả, Manager chỉ thấy
 * tòa được gán. Không có nhánh `if` nào sau khi query — dữ liệu ngoài phạm vi
 * không bao giờ ra khỏi database.
 */
export async function list(user: AuthUser, query: BuildingListQuery) {
  // Dùng AND thay vì spread: ownBuildingScope() trả về khóa `id`, spread chung
  // với bộ lọc khác có thể đè mất điều kiện phạm vi.
  const where: Prisma.BuildingWhereInput = {
    AND: [
      ownBuildingScope(user),
      query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {},
      query.isActive !== undefined ? { isActive: query.isActive } : {},
      query.gender ? { gender: query.gender } : {},
    ],
  };

  const result = await paginate(
    query,
    { sortable: ['name', 'floors', 'createdAt'], defaultSort: { field: 'name', order: 'asc' } },
    (page) => prisma.building.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.building.count({ where }),
  );
  return { data: result.data.map(toDto), meta: result.meta };
}

export async function getById(user: AuthUser, id: string) {
  const building = await prisma.building.findFirst({
    where: { AND: [{ id }, ownBuildingScope(user)] },
    include: INCLUDE,
  });
  if (!building) throw outOfScope(user, 'Không tìm thấy tòa nhà');
  return toDto(building);
}

async function assertNameAvailable(name: string, exceptId?: string) {
  const taken = await prisma.building.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (taken) throw ApiError.conflict('BUILDING_NAME_TAKEN', `Tên tòa nhà "${name}" đã tồn tại`);
}

/*
 * Các thao tác ghi dưới đây chỉ ADMIN gọi được (chặn ở route) và ADMIN không
 * bị giới hạn phạm vi, nên ghi thẳng theo id thay vì updateMany kèm scope.
 */

export async function create(input: CreateBuildingInput) {
  await assertNameAvailable(input.name);
  const building = await prisma.building.create({ data: input, include: INCLUDE });
  return toDto(building);
}

export async function update(id: string, input: UpdateBuildingInput) {
  const current = await prisma.building.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw ApiError.notFound('Không tìm thấy tòa nhà');

  if (input.name !== undefined) await assertNameAvailable(input.name, id);

  if (input.floors !== undefined) {
    const highest = await prisma.room.findFirst({
      where: { buildingId: id, floor: { gt: input.floors } },
      orderBy: { floor: 'desc' },
      select: { floor: true },
    });
    if (highest) {
      throw ApiError.conflict(
        'FLOORS_BELOW_ROOMS',
        `Tòa nhà đang có phòng ở tầng ${highest.floor}, không thể giảm số tầng xuống ${input.floors}`,
      );
    }
  }

  const building = await prisma.building.update({ where: { id }, data: input, include: INCLUDE });
  return toDto(building);
}

/**
 * Chỉ xóa cứng được tòa còn trống. Tòa đã có phòng thì từ chối kèm lý do —
 * người dùng tự quyết định chuyển sang ngừng hoạt động (`PATCH isActive=false`),
 * không tự động ẩn đi sau lưng họ.
 */
export async function remove(id: string) {
  const building = await prisma.building.findUnique({
    where: { id },
    select: { name: true, _count: { select: { rooms: true, managers: true } } },
  });
  if (!building) throw ApiError.notFound('Không tìm thấy tòa nhà');

  if (building._count.rooms > 0) {
    throw ApiError.conflict(
      'BUILDING_HAS_ROOMS',
      `Tòa nhà ${building.name} đang có ${building._count.rooms} phòng nên không thể xóa. ` +
        'Hãy chuyển tòa nhà sang trạng thái ngừng hoạt động.',
    );
  }
  if (building._count.managers > 0) {
    throw ApiError.conflict(
      'BUILDING_HAS_MANAGERS',
      `Tòa nhà ${building.name} đang được gán cho ${building._count.managers} quản lý. ` +
        'Hãy gỡ quản lý khỏi tòa nhà trước khi xóa.',
    );
  }

  await prisma.building.delete({ where: { id } });
  return { id };
}

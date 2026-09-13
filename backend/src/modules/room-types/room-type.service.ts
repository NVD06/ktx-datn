import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import type {
  CreateRoomTypeInput,
  RoomTypeListQuery,
  UpdateRoomTypeInput,
} from './room-type.schema.js';

/*
 * Loại phòng là danh mục dùng chung toàn hệ thống, không gắn theo tòa nên
 * không có buildingScope. Quyền ghi (chỉ ADMIN) chặn ở route.
 */

const INCLUDE = { _count: { select: { rooms: true } } } as const satisfies Prisma.RoomTypeInclude;

type RoomTypeRow = Prisma.RoomTypeGetPayload<{ include: typeof INCLUDE }>;

function toDto({ _count, ...roomType }: RoomTypeRow) {
  return { ...roomType, roomCount: _count.rooms };
}

export async function list(query: RoomTypeListQuery) {
  const where: Prisma.RoomTypeWhereInput = {
    AND: [
      query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {},
      query.isActive !== undefined ? { isActive: query.isActive } : {},
    ],
  };

  const result = await paginate(
    query,
    {
      sortable: ['name', 'capacity', 'price', 'createdAt'],
      defaultSort: { field: 'name', order: 'asc' },
    },
    (page) => prisma.roomType.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.roomType.count({ where }),
  );
  return { data: result.data.map(toDto), meta: result.meta };
}

export async function getById(id: string) {
  const roomType = await prisma.roomType.findUnique({ where: { id }, include: INCLUDE });
  if (!roomType) throw ApiError.notFound('Không tìm thấy loại phòng');
  return toDto(roomType);
}

async function assertNameAvailable(name: string, exceptId?: string) {
  const taken = await prisma.roomType.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (taken) throw ApiError.conflict('ROOM_TYPE_NAME_TAKEN', `Loại phòng "${name}" đã tồn tại`);
}

export async function create(input: CreateRoomTypeInput) {
  await assertNameAvailable(input.name);
  const roomType = await prisma.roomType.create({ data: input, include: INCLUDE });
  return toDto(roomType);
}

/**
 * Đổi `price` ở đây chỉ áp dụng cho hợp đồng tạo về sau: hợp đồng đã ký giữ
 * giá của riêng nó ở `Contract.price` (nguyên tắc snapshot, database.md §1).
 */
export async function update(id: string, input: UpdateRoomTypeInput) {
  const current = await prisma.roomType.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw ApiError.notFound('Không tìm thấy loại phòng');

  if (input.name !== undefined) await assertNameAvailable(input.name, id);

  if (input.capacity !== undefined) {
    // Phòng đông giường nhất đang dùng loại này quyết định sức chứa tối thiểu.
    const crowded = await prisma.room.findFirst({
      where: { roomTypeId: id },
      orderBy: { beds: { _count: 'desc' } },
      select: {
        code: true,
        building: { select: { name: true } },
        _count: { select: { beds: true } },
      },
    });
    if (crowded && crowded._count.beds > input.capacity) {
      throw ApiError.conflict(
        'CAPACITY_BELOW_BEDS',
        `Phòng ${crowded.code} (tòa ${crowded.building.name}) đang có ${crowded._count.beds} giường, ` +
          `không thể giảm sức chứa xuống ${input.capacity}. Hãy xóa bớt giường trước.`,
      );
    }
  }

  const roomType = await prisma.roomType.update({ where: { id }, data: input, include: INCLUDE });
  return toDto(roomType);
}

export async function remove(id: string) {
  const roomType = await prisma.roomType.findUnique({
    where: { id },
    select: { name: true, _count: { select: { rooms: true, registrations: true } } },
  });
  if (!roomType) throw ApiError.notFound('Không tìm thấy loại phòng');

  if (roomType._count.rooms > 0) {
    throw ApiError.conflict(
      'ROOM_TYPE_IN_USE',
      `Loại phòng "${roomType.name}" đang được ${roomType._count.rooms} phòng sử dụng nên không thể xóa. ` +
        'Hãy chuyển loại phòng sang trạng thái ngừng sử dụng.',
    );
  }
  if (roomType._count.registrations > 0) {
    throw ApiError.conflict(
      'ROOM_TYPE_HAS_REGISTRATIONS',
      `Loại phòng "${roomType.name}" đã có sinh viên chọn làm nguyện vọng nên không thể xóa. ` +
        'Hãy chuyển loại phòng sang trạng thái ngừng sử dụng.',
    );
  }

  await prisma.roomType.delete({ where: { id } });
  return { id };
}

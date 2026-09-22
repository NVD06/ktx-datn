import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type SortOptions } from '../../utils/paginate.js';
import { buildingScope, outOfScope, ownBuildingScope } from '../../utils/scope.js';
import { bedCodes, compareBedCode } from '../beds/bed-code.js';
import { roomStatusWhere, summarizeBeds } from './room-status.js';
import type {
  AvailableRoomQuery,
  BuildingRoomListQuery,
  CreateRoomInput,
  RoomListQuery,
  UpdateRoomInput,
} from './room.schema.js';

const SORT: SortOptions = {
  sortable: ['code', 'floor', 'createdAt'],
  defaultSort: { field: 'code', order: 'asc' },
};

const ROOM_TYPE_SELECT = { id: true, name: true, capacity: true, price: true } as const;

const LIST_INCLUDE = {
  building: { select: { id: true, name: true } },
  roomType: { select: ROOM_TYPE_SELECT },
  beds: { select: { status: true } },
} as const satisfies Prisma.RoomInclude;

const DETAIL_INCLUDE = {
  building: { select: { id: true, name: true, floors: true } },
  roomType: { select: ROOM_TYPE_SELECT },
  beds: {
    select: { id: true, roomId: true, code: true, status: true, createdAt: true, updatedAt: true },
  },
} as const satisfies Prisma.RoomInclude;

type RoomListRow = Prisma.RoomGetPayload<{ include: typeof LIST_INCLUDE }>;
type RoomDetailRow = Prisma.RoomGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function toListItem({ beds, ...room }: RoomListRow) {
  return { ...room, ...summarizeBeds(beds) };
}

function toDetail(room: RoomDetailRow) {
  return { ...room, ...summarizeBeds(room.beds), beds: [...room.beds].sort(compareBedCode) };
}

// ── Kiểm tra dùng chung ─────────────────────────────────────────────────────

async function findBuildingInScope(user: AuthUser, buildingId: string) {
  const building = await prisma.building.findFirst({
    where: { AND: [{ id: buildingId }, ownBuildingScope(user)] },
    select: { id: true, name: true, floors: true, isActive: true },
  });
  if (!building) throw outOfScope(user, 'Không tìm thấy tòa nhà');
  return building;
}

function assertFloorInBuilding(floor: number, building: { name: string; floors: number }) {
  if (floor > building.floors) {
    const message = `Tòa nhà ${building.name} chỉ có ${building.floors} tầng`;
    throw ApiError.badRequest('FLOOR_OUT_OF_RANGE', message, { floor: [message] });
  }
}

async function findActiveRoomType(id: string) {
  const roomType = await prisma.roomType.findUnique({
    where: { id },
    select: { name: true, capacity: true, isActive: true },
  });
  if (!roomType) {
    const message = 'Loại phòng không tồn tại';
    throw ApiError.badRequest('ROOM_TYPE_NOT_FOUND', message, { roomTypeId: [message] });
  }
  if (!roomType.isActive) {
    const message = `Loại phòng "${roomType.name}" đã ngừng sử dụng`;
    throw ApiError.badRequest('ROOM_TYPE_INACTIVE', message, { roomTypeId: [message] });
  }
  return roomType;
}

async function assertCodeAvailable(buildingId: string, code: string, exceptId?: string) {
  const taken = await prisma.room.findFirst({
    where: {
      buildingId,
      code: { equals: code, mode: 'insensitive' },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (taken) throw ApiError.conflict('ROOM_CODE_TAKEN', `Mã phòng ${code} đã tồn tại trong tòa nhà này`);
}

// ── Đọc ─────────────────────────────────────────────────────────────────────

export async function list(user: AuthUser, query: RoomListQuery) {
  // Mỗi điều kiện một phần tử AND: bộ lọc `buildingId` của người dùng không
  // thể đè lên `buildingId` của scope như khi spread chung một object.
  const where: Prisma.RoomWhereInput = {
    AND: [
      buildingScope(user),
      query.buildingId ? { buildingId: query.buildingId } : {},
      query.roomTypeId ? { roomTypeId: query.roomTypeId } : {},
      query.floor !== undefined ? { floor: query.floor } : {},
      query.isActive !== undefined ? { isActive: query.isActive } : {},
      query.search ? { code: { contains: query.search, mode: 'insensitive' } } : {},
      query.status ? roomStatusWhere(query.status) : {},
    ],
  };

  const result = await paginate(
    query,
    SORT,
    (page) => prisma.room.findMany({ where, ...page, include: LIST_INCLUDE }),
    () => prisma.room.count({ where }),
  );
  return { data: result.data.map(toListItem), meta: result.meta };
}

/** Kiểm tra tòa trước để Manager hỏi tòa khác nhận 403 thay vì một danh sách rỗng. */
export async function listByBuilding(
  user: AuthUser,
  buildingId: string,
  query: BuildingRoomListQuery,
) {
  await findBuildingInScope(user, buildingId);
  return list(user, { ...query, buildingId });
}

export async function getById(user: AuthUser, id: string) {
  const room = await prisma.room.findFirst({
    where: { id, ...buildingScope(user) },
    include: DETAIL_INCLUDE,
  });
  if (!room) throw outOfScope(user, 'Không tìm thấy phòng');
  return toDetail(room);
}

/**
 * Điều kiện chung của "phòng còn chỗ": phòng, tòa, loại phòng đang hoạt động
 * và còn ít nhất 1 giường trống.
 *
 * Sinh viên chỉ thấy tòa cùng giới tính với mình và tòa hỗn hợp (gender = null);
 * bộ lọc `gender` trên URL bị bỏ qua để không xem được tòa khác giới. Tài khoản
 * STUDENT chưa có hồ sơ (do Admin tạo tay) chưa rõ giới tính nên chỉ thấy tòa hỗn hợp.
 */
async function availableWhere(user: AuthUser): Promise<Prisma.RoomWhereInput> {
  const base: Prisma.RoomWhereInput = {
    isActive: true,
    building: { isActive: true },
    roomType: { isActive: true },
    beds: { some: { status: 'AVAILABLE' } },
  };
  if (user.role !== 'STUDENT') return base;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { gender: true },
  });
  const genders = profile ? [{ gender: profile.gender }, { gender: null }] : [{ gender: null }];
  return { AND: [base, { building: { OR: genders } }] };
}

/**
 * Phòng còn chỗ cho sinh viên xem. Không dùng buildingScope (vốn chặn STUDENT)
 * mà chỉ trả thông tin công khai: không có giường cụ thể, không có người ở.
 */
export async function listAvailable(user: AuthUser, query: AvailableRoomQuery) {
  const where: Prisma.RoomWhereInput = {
    AND: [
      await availableWhere(user),
      query.buildingId ? { buildingId: query.buildingId } : {},
      query.roomTypeId ? { roomTypeId: query.roomTypeId } : {},
      // Tòa hỗn hợp lưu gender = null trong DB. Với sinh viên, availableWhere đã khóa giới tính.
      query.gender && user.role !== 'STUDENT'
        ? { building: { gender: query.gender === 'MIXED' ? null : query.gender } }
        : {},
      query.search ? { code: { contains: query.search, mode: 'insensitive' } } : {},
    ],
  };

  const result = await paginate(
    query,
    SORT,
    (page) =>
      prisma.room.findMany({
        where,
        ...page,
        select: {
          id: true,
          code: true,
          floor: true,
          building: { select: { id: true, name: true, gender: true } },
          roomType: { select: ROOM_TYPE_SELECT },
          beds: { where: { status: 'AVAILABLE' }, select: { id: true } },
        },
      }),
    () => prisma.room.count({ where }),
  );

  return {
    data: result.data.map(({ beds, ...room }) => ({ ...room, availableBeds: beds.length })),
    meta: result.meta,
  };
}

/**
 * Tòa và loại phòng đang có phòng còn chỗ mà người này xem được — cho bộ lọc
 * của trang phòng còn chỗ (sinh viên không gọi được /buildings, /room-types).
 */
export async function listAvailableOptions(user: AuthUser) {
  const rooms = { some: await availableWhere(user) };
  const [buildings, roomTypes] = await Promise.all([
    prisma.building.findMany({
      where: { rooms },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, gender: true },
    }),
    prisma.roomType.findMany({
      where: { rooms },
      orderBy: { name: 'asc' },
      select: ROOM_TYPE_SELECT,
    }),
  ]);
  return { buildings, roomTypes };
}

// ── Ghi ─────────────────────────────────────────────────────────────────────

export async function create(user: AuthUser, input: CreateRoomInput) {
  const building = await findBuildingInScope(user, input.buildingId);
  if (!building.isActive) {
    throw ApiError.conflict(
      'BUILDING_INACTIVE',
      `Tòa nhà ${building.name} đang ngừng hoạt động, không thể thêm phòng`,
    );
  }
  assertFloorInBuilding(input.floor, building);
  const roomType = await findActiveRoomType(input.roomTypeId);
  await assertCodeAvailable(input.buildingId, input.code);

  const room = await prisma.room.create({
    data: {
      ...input,
      // Sinh sẵn đủ giường theo sức chứa. Nested create chạy chung transaction
      // với lệnh tạo phòng nên không bao giờ có phòng thiếu giường.
      beds: { create: bedCodes(roomType.capacity).map((code) => ({ code })) },
    },
    include: DETAIL_INCLUDE,
  });
  return toDetail(room);
}

export async function update(user: AuthUser, id: string, input: UpdateRoomInput) {
  const room = await prisma.room.findFirst({
    where: { id, ...buildingScope(user) },
    select: {
      buildingId: true,
      roomTypeId: true,
      building: { select: { name: true, floors: true } },
      _count: { select: { beds: true } },
    },
  });
  if (!room) throw outOfScope(user, 'Không tìm thấy phòng');

  if (input.floor !== undefined) assertFloorInBuilding(input.floor, room.building);
  if (input.code !== undefined) await assertCodeAvailable(room.buildingId, input.code, id);

  if (input.roomTypeId !== undefined && input.roomTypeId !== room.roomTypeId) {
    const roomType = await findActiveRoomType(input.roomTypeId);
    if (room._count.beds > roomType.capacity) {
      throw ApiError.conflict(
        'CAPACITY_BELOW_BEDS',
        `Phòng đang có ${room._count.beds} giường, loại phòng "${roomType.name}" chỉ chứa ` +
          `${roomType.capacity} giường. Hãy xóa bớt giường trước khi đổi loại phòng.`,
      );
    }
  }

  const { count } = await prisma.room.updateMany({
    where: { id, ...buildingScope(user) },
    data: input,
  });
  if (count === 0) throw outOfScope(user, 'Không tìm thấy phòng');

  return getById(user, id);
}

/**
 * Chỉ xóa cứng được phòng chưa từng được dùng. Phòng đã có hợp đồng hoặc lịch
 * sử sửa chữa/vệ sinh thì từ chối kèm lý do — chuyển `isActive = false`.
 */
export async function remove(user: AuthUser, id: string) {
  const room = await prisma.room.findFirst({
    where: { id, ...buildingScope(user) },
    select: { code: true, _count: { select: { requests: true, hygiene: true } } },
  });
  if (!room) throw outOfScope(user, 'Không tìm thấy phòng');

  const contracts = await prisma.contract.count({ where: { bed: { roomId: id } } });
  if (contracts > 0) {
    throw ApiError.conflict(
      'ROOM_HAS_CONTRACTS',
      `Phòng ${room.code} đã có hợp đồng nên không thể xóa. Hãy chuyển phòng sang trạng thái ngừng hoạt động.`,
    );
  }
  if (room._count.requests + room._count.hygiene > 0) {
    throw ApiError.conflict(
      'ROOM_HAS_HISTORY',
      `Phòng ${room.code} đã có lịch sử sửa chữa hoặc vệ sinh nên không thể xóa. ` +
        'Hãy chuyển phòng sang trạng thái ngừng hoạt động.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.bed.deleteMany({ where: { roomId: id } });
    const { count } = await tx.room.deleteMany({ where: { id, ...buildingScope(user) } });
    // Ném lỗi trong transaction -> các giường vừa xóa cũng được hoàn tác.
    if (count === 0) throw outOfScope(user, 'Không tìm thấy phòng');
  });
  return { id };
}

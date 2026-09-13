import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { nextBedCode } from './bed-code.js';
import type { CreateBedInput, UpdateBedInput } from './bed.schema.js';

/*
 * Giường cách Building hai cấp nên scope lồng qua quan hệ:
 *   where: { id, room: buildingScope(user) }
 */

const SELECT = {
  id: true,
  roomId: true,
  code: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.BedSelect;

/**
 * Chạy trong transaction Serializable: hai request thêm giường cùng lúc không
 * thể cùng đọc thấy "còn chỗ" rồi cùng ghi, làm phòng vượt sức chứa.
 */
export async function create(user: AuthUser, roomId: string, input: CreateBedInput) {
  return prisma.$transaction(
    async (tx) => {
      const room = await tx.room.findFirst({
        where: { id: roomId, ...buildingScope(user) },
        select: {
          code: true,
          roomType: { select: { name: true, capacity: true } },
          beds: { select: { code: true } },
        },
      });
      if (!room) throw outOfScope(user, 'Không tìm thấy phòng');

      if (room.beds.length >= room.roomType.capacity) {
        throw ApiError.conflict(
          'ROOM_CAPACITY_REACHED',
          `Phòng ${room.code} đã đủ ${room.roomType.capacity} giường theo loại phòng "${room.roomType.name}"`,
        );
      }

      const existing = room.beds.map((bed) => bed.code);
      const code = input.code ?? nextBedCode(existing);
      if (existing.some((c) => c.toLowerCase() === code.toLowerCase())) {
        throw ApiError.conflict('BED_CODE_TAKEN', `Giường ${code} đã có trong phòng ${room.code}`);
      }

      return tx.bed.create({ data: { roomId, code }, select: SELECT });
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function update(user: AuthUser, id: string, input: UpdateBedInput) {
  const bed = await prisma.bed.findFirst({
    where: { id, room: buildingScope(user) },
    select: { roomId: true, code: true, status: true },
  });
  if (!bed) throw outOfScope(user, 'Không tìm thấy giường');

  if (input.status !== undefined && bed.status === 'OCCUPIED') {
    throw ApiError.conflict(
      'BED_OCCUPIED',
      `Giường ${bed.code} đang có sinh viên ở, không thể đổi trạng thái`,
    );
  }

  if (input.code !== undefined) {
    const taken = await prisma.bed.findFirst({
      where: {
        roomId: bed.roomId,
        code: { equals: input.code, mode: 'insensitive' },
        NOT: { id },
      },
      select: { id: true },
    });
    if (taken) throw ApiError.conflict('BED_CODE_TAKEN', `Giường ${input.code} đã có trong phòng`);
  }

  const { count } = await prisma.bed.updateMany({
    where: {
      id,
      room: buildingScope(user),
      // Lặp lại điều kiện ngay lúc ghi: hợp đồng có thể vừa kích hoạt giường này.
      ...(input.status !== undefined ? { status: { not: 'OCCUPIED' } } : {}),
    },
    data: input,
  });
  if (count === 0) {
    throw ApiError.conflict('BED_CHANGED', 'Giường vừa được thay đổi bởi thao tác khác, vui lòng tải lại');
  }

  return prisma.bed.findUniqueOrThrow({ where: { id }, select: SELECT });
}

export async function remove(user: AuthUser, id: string) {
  const bed = await prisma.bed.findFirst({
    where: { id, room: buildingScope(user) },
    select: { code: true, status: true, _count: { select: { contracts: true } } },
  });
  if (!bed) throw outOfScope(user, 'Không tìm thấy giường');

  if (bed.status === 'OCCUPIED') {
    throw ApiError.conflict('BED_OCCUPIED', `Giường ${bed.code} đang có sinh viên ở, không thể xóa`);
  }
  if (bed._count.contracts > 0) {
    throw ApiError.conflict(
      'BED_HAS_CONTRACTS',
      `Giường ${bed.code} đã có lịch sử hợp đồng nên không thể xóa. Hãy chuyển giường sang bảo trì nếu không dùng nữa.`,
    );
  }

  const { count } = await prisma.bed.deleteMany({
    where: { id, room: buildingScope(user), status: { not: 'OCCUPIED' } },
  });
  if (count === 0) {
    throw ApiError.conflict('BED_CHANGED', 'Giường vừa được thay đổi bởi thao tác khác, vui lòng tải lại');
  }
  return { id };
}

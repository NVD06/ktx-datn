import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { ROOM_STATUSES } from './room-status.js';

const code = z
  .string()
  .trim()
  .min(1, 'Mã phòng không được để trống')
  .max(20, 'Mã phòng tối đa 20 ký tự')
  .regex(/^[A-Za-z0-9._-]+$/, 'Mã phòng chỉ gồm chữ không dấu, số và các ký tự . _ -');
const floor = z.int('Tầng phải là số nguyên').min(1, 'Tầng phải từ 1 trở lên');
const roomTypeId = z.uuid('Loại phòng không hợp lệ');

export const createRoomSchema = z
  .object({
    buildingId: z.uuid('Tòa nhà không hợp lệ'),
    roomTypeId,
    code: code.openapi({ example: '301' }),
    floor: floor.openapi({ example: 3 }),
    isActive: z.boolean().exactOptional(),
  })
  .openapi('CreateRoomInput', {
    description: 'Giường được sinh tự động G1..Gn theo sức chứa của loại phòng.',
  });

export const updateRoomSchema = z
  .object({
    roomTypeId: roomTypeId
      .exactOptional()
      .openapi({ description: 'Loại mới phải chứa đủ số giường phòng đang có' }),
    code: code.exactOptional(),
    floor: floor.exactOptional(),
    isActive: z.boolean().exactOptional(),
  })
  .openapi('UpdateRoomInput', { description: 'Không đổi được tòa nhà của phòng.' });

const roomFilters = {
  roomTypeId: z.uuid().optional(),
  floor: z.coerce.number().int().min(1).optional(),
  status: z.enum(ROOM_STATUSES).optional(),
  isActive: booleanQuery.optional(),
};

export const roomListQuerySchema = listQuerySchema.extend({
  buildingId: z.uuid().optional(),
  ...roomFilters,
});

export const buildingRoomListQuerySchema = listQuerySchema.extend(roomFilters);

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomListQuery = z.infer<typeof roomListQuerySchema>;
export type BuildingRoomListQuery = z.infer<typeof buildingRoomListQuerySchema>;

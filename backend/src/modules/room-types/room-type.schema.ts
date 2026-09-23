import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';
import { optionalText } from '../../utils/zod-fields.js';

const name = z
  .string()
  .trim()
  .min(1, 'Tên loại phòng không được để trống')
  .max(100, 'Tên loại phòng tối đa 100 ký tự');
const capacity = z
  .int('Sức chứa phải là số nguyên')
  .min(1, 'Sức chứa tối thiểu là 1 giường')
  .max(20, 'Sức chứa tối đa là 20 giường');
const price = z
  .int('Giá phải là số nguyên (đồng)')
  .min(0, 'Giá không được âm')
  .max(100_000_000, 'Giá tối đa là 100.000.000 đ');
const description = optionalText('Mô tả', 500);

export const createRoomTypeSchema = z
  .object({
    name: name.openapi({ example: 'Phòng 6 giường - điều hòa' }),
    capacity: capacity.openapi({ example: 6 }),
    price: price.openapi({ example: 1_200_000, description: 'Giá một kỳ cho một sinh viên' }),
    description: description.exactOptional(),
    isActive: z.boolean().exactOptional(),
  })
  .openapi('CreateRoomTypeInput');

export const updateRoomTypeSchema = z
  .object({
    name: name.exactOptional(),
    capacity: capacity
      .exactOptional()
      .openapi({ description: 'Không được nhỏ hơn số giường của bất kỳ phòng nào đang dùng loại này' }),
    price: price
      .exactOptional()
      .openapi({ description: 'Không ảnh hưởng hợp đồng đã ký (Contract.price là snapshot)' }),
    description: description.exactOptional(),
    isActive: z.boolean().exactOptional(),
  })
  .openapi('UpdateRoomTypeInput');

export const roomTypeListQuerySchema = listQuerySchema.extend({
  isActive: booleanQuery.optional(),
});

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type RoomTypeListQuery = z.infer<typeof roomTypeListQuerySchema>;

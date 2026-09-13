import '../../config/openapi.js';
import { z } from 'zod';
import { booleanQuery, listQuerySchema } from '../../utils/query-schema.js';

const name = z
  .string()
  .trim()
  .min(1, 'Tên tòa nhà không được để trống')
  .max(50, 'Tên tòa nhà tối đa 50 ký tự');
const floors = z
  .int('Số tầng phải là số nguyên')
  .min(1, 'Tòa nhà phải có ít nhất 1 tầng')
  .max(50, 'Số tầng tối đa là 50');
const gender = z
  .enum(['MALE', 'FEMALE'], 'Giới tính không hợp lệ')
  .nullable()
  .openapi({ description: 'null = tòa hỗn hợp' });
const description = z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').nullable();

export const createBuildingSchema = z
  .object({
    name: name.openapi({ example: 'B3' }),
    floors: floors.openapi({ example: 5 }),
    gender: gender.exactOptional(),
    description: description.exactOptional(),
    isActive: z.boolean().exactOptional(),
  })
  .openapi('CreateBuildingInput');

export const updateBuildingSchema = z
  .object({
    name: name.exactOptional(),
    floors: floors.exactOptional(),
    gender: gender.exactOptional(),
    description: description.exactOptional(),
    isActive: z
      .boolean()
      .exactOptional()
      .openapi({ description: 'false = ngừng hoạt động (thay cho xóa khi tòa đã có phòng)' }),
  })
  .openapi('UpdateBuildingInput');

export const buildingListQuerySchema = listQuerySchema.extend({
  isActive: booleanQuery.optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
});

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;
export type BuildingListQuery = z.infer<typeof buildingListQuerySchema>;

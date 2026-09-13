import '../../config/openapi.js';
import { z } from 'zod';

const code = z
  .string()
  .trim()
  .min(1, 'Mã giường không được để trống')
  .max(10, 'Mã giường tối đa 10 ký tự')
  .regex(/^[A-Za-z0-9._-]+$/, 'Mã giường chỉ gồm chữ không dấu, số và các ký tự . _ -');

export const createBedSchema = z
  .object({
    code: code
      .exactOptional()
      .openapi({ example: 'G5', description: 'Bỏ trống để tự lấy mã trống nhỏ nhất (G1, G2…)' }),
  })
  .openapi('CreateBedInput');

export const updateBedSchema = z
  .object({
    code: code.exactOptional(),
    // OCCUPIED cố ý không có ở đây: giường chỉ có người ở khi hợp đồng kích hoạt.
    status: z
      .enum(['AVAILABLE', 'MAINTENANCE'], 'Chỉ được chuyển giường giữa trống và bảo trì')
      .exactOptional(),
  })
  .openapi('UpdateBedInput');

export type CreateBedInput = z.infer<typeof createBedSchema>;
export type UpdateBedInput = z.infer<typeof updateBedSchema>;

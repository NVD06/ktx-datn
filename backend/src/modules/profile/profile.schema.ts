import '../../config/openapi.js';
import { z } from 'zod';
import { dateField, optionalText, phoneSchema } from '../../utils/zod-fields.js';

/*
 * Sinh viên tự sửa thông tin liên hệ/cá nhân. `studentCode` và `gender` KHÔNG
 * sửa được ở đây: giới tính quyết định tòa được ở, mã SV là định danh của trường.
 * Mọi trường nhận `null` để xóa giá trị đã nhập.
 */

export const updateProfileSchema = z
  .object({
    phone: phoneSchema.nullable().exactOptional(),
    dob: dateField('Ngày sinh')
      // refine thay vì .max(new Date()): .max chốt "hôm nay" lúc server khởi động.
      .refine((d) => d <= new Date(), { message: 'Ngày sinh không được ở tương lai', abort: true })
      .refine((d) => new Date(d).setFullYear(d.getFullYear() + 15) <= Date.now(), 'Sinh viên phải đủ 15 tuổi')
      .nullable()
      .exactOptional()
      .openapi({ example: '2005-03-15T00:00:00.000Z' }),
    className: optionalText('Lớp', 50).exactOptional().openapi({ example: 'CNTT1' }),
    faculty: optionalText('Khoa', 100).exactOptional().openapi({ example: 'Công nghệ thông tin' }),
    hometown: optionalText('Quê quán', 200).exactOptional().openapi({ example: 'Hà Nội' }),
    citizenId: z
      .string()
      .trim()
      .regex(/^\d{12}$/, 'Số CCCD phải gồm đúng 12 chữ số')
      .nullable()
      .exactOptional()
      .openapi({ example: '001205012345' }),
  })
  .openapi('UpdateProfileInput');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

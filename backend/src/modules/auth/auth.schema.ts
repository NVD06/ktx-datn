import '../../config/openapi.js';
import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.email('Email không hợp lệ').toLowerCase().trim().openapi({ example: 'sv001@example.com' }),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(72).openapi({ example: 'matkhau123' }),
    fullName: z.string().min(2, 'Họ tên quá ngắn').max(100).trim().openapi({ example: 'Nguyễn Văn A' }),
    phone: z
      .string()
      .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
      .optional()
      .openapi({ example: '0912345678' }),
    studentCode: z.string().min(3, 'Mã sinh viên quá ngắn').max(20).trim().openapi({ example: 'SV001' }),
    gender: z.enum(['MALE', 'FEMALE']),
    className: z.string().max(50).trim().optional().openapi({ example: 'CNTT1' }),
    faculty: z.string().max(100).trim().optional().openapi({ example: 'Công nghệ thông tin' }),
  })
  .openapi('RegisterInput');

export type RegisterInput = z.infer<typeof registerSchema>;

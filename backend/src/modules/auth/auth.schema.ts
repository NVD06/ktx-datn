import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email('Email không hợp lệ').toLowerCase().trim(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(72),
  fullName: z.string().min(2, 'Họ tên quá ngắn').max(100).trim(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0')
    .optional(),
  studentCode: z.string().min(3, 'Mã sinh viên quá ngắn').max(20).trim(),
  gender: z.enum(['MALE', 'FEMALE']),
  className: z.string().max(50).trim().optional(),
  faculty: z.string().max(100).trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

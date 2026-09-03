import { z } from 'zod';

/**
 * Đọc và kiểm tra biến môi trường ngay khi khởi động.
 * Thiếu biến nào thì dừng hẳn, thay vì để lỗi mơ hồ lúc chạy.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'Thiếu chuỗi kết nối PostgreSQL'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET phải dài tối thiểu 32 ký tự'),
  FRONTEND_URL: z.url('FRONTEND_URL phải là URL hợp lệ').default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nBiến môi trường không hợp lệ — kiểm tra lại file backend/.env:\n');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nXem backend/.env.example để biết cần những biến nào.\n');
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === 'development';

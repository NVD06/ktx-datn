import { z } from 'zod';

/**
 * Đọc và kiểm tra biến môi trường ngay khi khởi động.
 * Thiếu biến nào thì dừng hẳn, thay vì để lỗi mơ hồ lúc chạy.
 */
const envSchema = z.object({
  // Mặc định production: quên khai báo thì không lộ chi tiết lỗi ra ngoài.
  // Máy dev đặt NODE_ENV=development trong .env.
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string('Thiếu chuỗi kết nối PostgreSQL').min(1, 'Thiếu chuỗi kết nối PostgreSQL'),
  AUTH_SECRET: z.string('Thiếu AUTH_SECRET').min(32, 'AUTH_SECRET phải dài tối thiểu 32 ký tự'),
  // VNPay sandbox — thiếu thì phần còn lại vẫn chạy, chỉ nút thanh toán báo chưa cấu hình.
  VNP_TMN_CODE: z.string().optional(),
  VNP_HASH_SECRET: z.string().optional(),
  VNP_URL: z.url('VNP_URL không hợp lệ').default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNP_RETURN_URL: z.url('VNP_RETURN_URL không hợp lệ').optional(),
});

// Dòng `PORT=` để trống trong .env cho ra chuỗi rỗng — coi như chưa khai báo
// để `.default()` còn tác dụng.
const input = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));

const parsed = envSchema.safeParse(input);

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

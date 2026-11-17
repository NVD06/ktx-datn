import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

/**
 * Biến môi trường khi chạy test — chỉ đọc `.env.test`, không đọc `.env` của máy dev.
 *
 * Test xóa sạch mọi bảng trước mỗi ca, nên chặn cứng: database không tên `*_test`
 * thì dừng luôn, tránh lỡ tay trỏ vào database đang dev.
 */
export function loadTestEnv() {
  const env = parse(readFileSync(path.resolve(import.meta.dirname, '../.env.test')));
  const dbName = env.DATABASE_URL ? new URL(env.DATABASE_URL).pathname.slice(1) : '';
  if (!dbName.endsWith('_test')) {
    throw new Error(`DATABASE_URL trong .env.test phải trỏ tới database tên *_test (đang là "${dbName}")`);
  }
  return env;
}

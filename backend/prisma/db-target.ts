import { env } from '../src/config/env.js';

/** Database script đang trỏ tới, bỏ tên đăng nhập và mật khẩu: "localhost:5432/ktx". */
export function dbTarget() {
  const url = new URL(env.DATABASE_URL);
  return `${url.host}${url.pathname}`;
}

/** Database nằm ngay trên máy đang chạy script — không phải database của bản deploy (Neon). */
export function isLocalDatabase() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.DATABASE_URL).hostname);
}

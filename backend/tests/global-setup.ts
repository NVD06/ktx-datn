import { execSync } from 'node:child_process';
import { loadTestEnv } from './test-env.js';

/** Chạy một lần trước cả bộ test: đưa database test lên migration mới nhất (chưa có thì Prisma tự tạo). */
export default function setup() {
  const { DATABASE_URL } = loadTestEnv();
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL }, stdio: 'ignore' });
}

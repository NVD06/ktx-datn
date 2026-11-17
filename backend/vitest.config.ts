import { defineConfig } from 'vitest/config';
import { loadTestEnv } from './tests/test-env.js';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: loadTestEnv(),
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup.ts'],
    // Mọi file dùng chung một database test và xóa sạch nó trước mỗi ca — chạy lần lượt.
    fileParallelism: false,
  },
});

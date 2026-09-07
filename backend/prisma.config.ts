import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Từ Prisma 7, chuỗi kết nối không còn khai báo trong schema.prisma nữa —
 * CLI (migrate / studio / db seed) đọc từ đây, còn PrismaClient lúc chạy
 * lấy qua driver adapter trong src/config/prisma.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});

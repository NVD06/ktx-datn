import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/prisma.js';

// Mỗi ca test bắt đầu từ database rỗng — dữ liệu ca trước không ảnh hưởng ca sau.
beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
});

afterAll(() => prisma.$disconnect());

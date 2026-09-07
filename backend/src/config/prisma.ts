import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Instance PrismaClient dùng chung cho toàn bộ ứng dụng.
 * Không tạo `new PrismaClient()` ở bất kỳ chỗ nào khác — mỗi instance mở
 * một connection pool riêng, tạo nhiều sẽ làm cạn kết nối của PostgreSQL.
 *
 * Từ Prisma 7, client kết nối qua driver adapter (`pg`) thay vì đọc
 * chuỗi kết nối từ schema.prisma.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { ApiError } from './api-error.js';
export const writeConflict = () =>
  ApiError.conflict('CONCURRENT_UPDATE', 'Dữ liệu vừa bị thay đổi bởi thao tác khác, vui lòng thử lại');
export function isWriteConflict(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code === 'P2034';
  return (err as { cause?: { kind?: string } } | null)?.cause?.kind === 'TransactionWriteConflict';
}
export async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (!isWriteConflict(err)) throw err;
      if (attempt === 5) throw writeConflict();
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt));
    }
  }
}

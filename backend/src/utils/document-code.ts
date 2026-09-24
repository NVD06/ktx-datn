import { Prisma } from '../generated/prisma/client.js';

/**
 * Mã chứng từ tăng dần theo năm: HD-2026-0001 (hợp đồng), INV-2026-0001 (hóa đơn).
 *
 * Gọi BÊN TRONG transaction sẽ ghi bản ghi mang mã đó. Hai transaction cùng lấy
 * mã một lúc sẽ cùng đọc được số lớn nhất và sinh trùng mã, nên trước khi đọc
 * phải giữ advisory lock theo tiền tố — transaction sau chờ transaction trước
 * commit rồi mới đọc, luôn thấy số mới nhất. Lock tự nhả khi transaction kết thúc.
 */

// Tên bảng không truyền được bằng tham số của câu SQL, nên chỉ nhận đúng các bảng này.
const TABLES = { HD: 'Contract', INV: 'Invoice' } as const;

export type DocumentPrefix = keyof typeof TABLES;

/** Năm theo giờ Việt Nam — hợp đồng tạo lúc 00:30 ngày 01/01 thuộc năm mới. */
function currentYear() {
  return new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date());
}

export async function nextDocumentCode(tx: Prisma.TransactionClient, prefix: DocumentPrefix) {
  const head = `${prefix}-${currentYear()}-`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${head}))`;

  // Sắp theo độ dài trước: qua số 9999 thì "HD-2026-10000" phải đứng sau "HD-2026-9999".
  const [last] = await tx.$queryRaw<{ code: string }[]>`
    SELECT code FROM ${Prisma.raw(`"${TABLES[prefix]}"`)}
    WHERE code LIKE ${`${head}%`}
    ORDER BY length(code) DESC, code DESC
    LIMIT 1`;

  const next = last ? Number(last.code.slice(head.length)) + 1 : 1;
  return `${head}${String(next).padStart(4, '0')}`;
}

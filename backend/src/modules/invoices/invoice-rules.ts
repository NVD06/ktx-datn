import { INVOICE_DUE_DAYS } from '../../config/constants.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { endOfDayVN } from '../../utils/date-vn.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hạn thanh toán hóa đơn: hết ngày thứ `days` giờ VN kể từ lúc lập (mặc định INVOICE_DUE_DAYS của
 * điện nước, tiền phòng truyền ROOM_FEE_DUE_DAYS) — hạn ghi ngày nào thì hết ngày đó mới quá hạn.
 */
export function invoiceDueDate(from: Date, days = INVOICE_DUE_DAYS) {
  return endOfDayVN(new Date(from.getTime() + days * DAY_MS));
}

/**
 * OVERDUE không lưu DB mà tính khi đọc (us-04.md, US-04.3): chưa thanh toán và
 * đã qua hạn. Điều kiện `where` tương ứng để lọc phía server.
 */
export function overdueWhere(now: Date): Prisma.InvoiceWhereInput {
  return { status: 'UNPAID', dueDate: { lt: now } };
}

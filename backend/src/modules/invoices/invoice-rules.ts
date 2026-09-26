import { INVOICE_DUE_DAYS } from '../../config/constants.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { endOfDayVN } from '../../utils/date-vn.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hạn thanh toán của mọi hóa đơn (tiền phòng, gia hạn, điện nước): hết ngày thứ
 * INVOICE_DUE_DAYS giờ VN kể từ lúc lập — hạn ghi ngày nào thì hết ngày đó mới quá hạn.
 */
export function invoiceDueDate(from: Date) {
  return endOfDayVN(new Date(from.getTime() + INVOICE_DUE_DAYS * DAY_MS));
}

/**
 * OVERDUE không lưu DB mà tính khi đọc (us-04.md, US-04.3): chưa thanh toán và
 * đã qua hạn. Điều kiện `where` tương ứng để lọc phía server.
 */
export function overdueWhere(now: Date): Prisma.InvoiceWhereInput {
  return { status: 'UNPAID', dueDate: { lt: now } };
}

import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { buildPayUrl, verifySignature, vnpDate } from '../../utils/vnpay.js';
import { contractScope } from '../contracts/contract.service.js';

/*
 * Thanh toán hóa đơn qua VNPay sandbox (US-04.4, US-04.5) — luồng ở payment-flow.md.
 * Mỗi lần bấm "Thanh toán" là một Payment mới, nên thanh toán lỗi rồi thử lại không bị
 * VNPay báo trùng mã giao dịch. Số tiền luôn lấy từ DB, không bao giờ nhận từ FE.
 */

/** Mã trả lời IPN theo tài liệu VNPay. */
export const IPN_MESSAGE = {
  '00': 'Confirm Success',
  '01': 'Order not found',
  '02': 'Order already confirmed',
  '04': 'Invalid amount',
  '97': 'Invalid signature',
  '99': 'Unknown error',
} as const;

type RspCode = keyof typeof IPN_MESSAGE;

/** SV tạo giao dịch cho hóa đơn của mình, nhận URL để chuyển sang cổng VNPay. */
export async function pay(user: AuthUser, invoiceId: string, ipAddr: string) {
  const { VNP_TMN_CODE: tmnCode, VNP_HASH_SECRET: secret, VNP_RETURN_URL: returnUrl } = env;
  if (!tmnCode || !secret || !returnUrl) {
    throw new ApiError(503, 'PAYMENT_UNAVAILABLE', 'Thanh toán VNPay chưa được cấu hình trên máy chủ');
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, contract: contractScope(user) },
    select: { id: true, code: true, amount: true, status: true },
  });
  if (!invoice) throw ApiError.notFound('Không tìm thấy hóa đơn');
  if (invoice.status === 'PAID') throw ApiError.conflict('INVOICE_PAID', `Hóa đơn ${invoice.code} đã được thanh toán`);

  // vnp_TxnRef chỉ nhận chữ và số nên bỏ dấu "-" của uuid.
  const txnRef = randomUUID().replaceAll('-', '');
  await prisma.payment.create({ data: { invoiceId: invoice.id, amount: invoice.amount, txnRef } });

  const now = new Date();
  const payUrl = buildPayUrl(
    env.VNP_URL,
    {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan hoa don ${invoice.code}`,
      vnp_OrderType: 'other',
      // Đơn vị nhỏ nhất: 500.000 đ gửi 50000000.
      vnp_Amount: String(Number(invoice.amount) * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: vnpDate(now),
      vnp_ExpireDate: vnpDate(new Date(now.getTime() + 15 * 60 * 1000)),
    },
    secret,
  );
  return { payUrl };
}

/**
 * Xác nhận kết quả VNPay — ReturnURL (trình duyệt SV) và IPN (server VNPay) cùng gọi,
 * SV còn có thể F5 trang kết quả, nên phải idempotent. Kiểm tra theo thứ tự của VNPay:
 * chữ ký (97) → giao dịch có thật (01) → đúng số tiền (04) → chưa xác nhận (02).
 * Hai lời gọi tới cùng lúc: điều kiện PENDING nằm ngay trong lệnh ghi nên chỉ một bên
 * ghi được, hóa đơn chuyển PAID đúng một lần.
 */
export async function confirm(query: Record<string, unknown>) {
  const q = query as Record<string, string | undefined>;
  const result = (rspCode: RspCode, paid = false, invoiceCode: string | null = null) => ({ rspCode, paid, invoiceCode });

  if (!env.VNP_HASH_SECRET || !verifySignature(query, env.VNP_HASH_SECRET)) return result('97');
  const payment = await prisma.payment.findUnique({
    where: { txnRef: q.vnp_TxnRef ?? '' },
    select: { id: true, amount: true, status: true, invoiceId: true, invoice: { select: { code: true } } },
  });
  if (!payment) return result('01');
  const { code } = payment.invoice;
  if (Number(q.vnp_Amount) !== Number(payment.amount) * 100) return result('04', false, code);
  if (payment.status !== 'PENDING') return result('02', payment.status === 'SUCCESS', code);

  const paid = q.vnp_ResponseCode === '00' && (q.vnp_TransactionStatus ?? '00') === '00';
  const written = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: paid ? 'SUCCESS' : 'FAILED',
        vnpResponseCode: q.vnp_ResponseCode ?? null,
        vnpTransactionNo: q.vnp_TransactionNo ?? null,
        paidAt: paid ? new Date() : null,
      },
    });
    if (count > 0 && paid) {
      await tx.invoice.updateMany({ where: { id: payment.invoiceId, status: 'UNPAID' }, data: { status: 'PAID' } });
    }
    return count > 0;
  });
  if (written) return result('00', paid, code);

  // Bên kia vừa ghi xong — đọc lại để trả đúng kết quả.
  const latest = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, select: { status: true } });
  return result('02', latest.status === 'SUCCESS', code);
}

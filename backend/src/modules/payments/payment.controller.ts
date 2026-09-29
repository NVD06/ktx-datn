import type { Request, Response } from 'express';
import * as paymentService from './payment.service.js';

/** GET /api/v1/payments/vnpay-return — VNPay đưa trình duyệt SV về đây, chuyển tiếp sang trang kết quả. */
export async function vnpayReturn(req: Request, res: Response) {
  const { rspCode, paid, invoiceCode } = await paymentService.confirm(req.query);
  const status = rspCode === '00' || rspCode === '02' ? (paid ? 'success' : 'failed') : 'invalid';
  const params = new URLSearchParams({ status, ...(invoiceCode ? { invoice: invoiceCode } : {}) });
  // Đường dẫn tương đối: FE và API chung một địa chỉ (khi dev thì đi qua Vite proxy).
  res.redirect(`/student/payment-result?${params}`);
}

/** GET /api/v1/payments/vnpay-ipn — server VNPay gọi; luôn trả đúng định dạng của VNPay, kể cả khi lỗi. */
export async function vnpayIpn(req: Request, res: Response) {
  try {
    const { rspCode } = await paymentService.confirm(req.query);
    res.json({ RspCode: rspCode, Message: paymentService.IPN_MESSAGE[rspCode] });
  } catch (err) {
    console.error('[vnpay-ipn]', err);
    res.json({ RspCode: '99', Message: paymentService.IPN_MESSAGE['99'] });
  }
}

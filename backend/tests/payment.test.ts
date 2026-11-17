import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { confirm, pay } from '../src/modules/payments/payment.service.js';
import { revenue } from '../src/modules/reports/report.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { currentMonthVN } from '../src/utils/date-vn.js';
import { buildPayUrl } from '../src/utils/vnpay.js';
import { createAdmin, createStudent, createUnpaidInvoice } from './factory.js';

const IP = '127.0.0.1';

/**
 * Query VNPay gửi về (ReturnURL / IPN) sau khi SV trả tiền: tham số lúc tạo giao dịch
 * cộng kết quả, ký lại bằng khóa bí mật giống VNPay làm.
 */
function vnpayCallback(payUrl: string, overrides: Record<string, string> = {}) {
  const { vnp_SecureHash: _, ...sent } = Object.fromEntries(new URL(payUrl).searchParams);
  const params = {
    ...sent,
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: '14123456',
    ...overrides,
  };
  return Object.fromEntries(new URL(buildPayUrl('https://vnpay.test', params, process.env.VNP_HASH_SECRET!)).searchParams);
}

describe('Thanh toán VNPay — pay() và confirm() (US-04.4, US-04.5)', () => {
  let student: AuthUser;
  let invoiceId: string;

  beforeEach(async () => {
    student = await createStudent('MALE');
    invoiceId = (await createUnpaidInvoice(student, { amount: 1_500_000 })).id;
  });

  async function invoiceState() {
    const row = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
    return { status: row.status, payments: row.payments.map((p) => p.status).sort() };
  }

  it('số tiền gửi VNPay lấy từ hóa đơn trong DB, nhân 100', async () => {
    const { payUrl } = await pay(student, invoiceId, IP);
    expect(new URL(payUrl).searchParams.get('vnp_Amount')).toBe('150000000');
    expect(await invoiceState()).toEqual({ status: 'UNPAID', payments: ['PENDING'] });
  });

  it('SV không trả được hóa đơn của người khác', async () => {
    const other = await createStudent('MALE');
    await expect(pay(other, invoiceId, IP)).rejects.toMatchObject({ status: 404 });
  });

  it('ReturnURL, IPN rồi SV F5 — cùng một giao dịch gọi 3 lần → PAID đúng một lần', async () => {
    const query = vnpayCallback((await pay(student, invoiceId, IP)).payUrl);

    expect(await confirm(query)).toMatchObject({ rspCode: '00', paid: true });
    expect(await confirm(query)).toMatchObject({ rspCode: '02', paid: true });
    expect(await confirm(query)).toMatchObject({ rspCode: '02', paid: true });

    expect(await invoiceState()).toEqual({ status: 'PAID', payments: ['SUCCESS'] });
    await expect(pay(student, invoiceId, IP)).rejects.toMatchObject({ status: 409, code: 'INVOICE_PAID' });
  });

  it('ReturnURL và IPN tới cùng lúc → đúng một lời gọi ghi, các lời gọi còn lại vẫn báo đã trả', async () => {
    const query = vnpayCallback((await pay(student, invoiceId, IP)).payUrl);

    const results = await Promise.all([confirm(query), confirm(query), confirm(query)]);

    expect(results.map((r) => r.rspCode).sort()).toEqual(['00', '02', '02']);
    expect(results.every((r) => r.paid)).toBe(true);
    expect(await invoiceState()).toEqual({ status: 'PAID', payments: ['SUCCESS'] });
  });

  it('sai chữ ký (97) hoặc chữ ký đúng nhưng lệch số tiền (04) → không ghi gì', async () => {
    const { payUrl } = await pay(student, invoiceId, IP);

    expect(await confirm({ ...vnpayCallback(payUrl), vnp_Amount: '100' })).toMatchObject({ rspCode: '97' });
    expect(await confirm(vnpayCallback(payUrl, { vnp_Amount: '100' }))).toMatchObject({ rspCode: '04' });

    expect(await invoiceState()).toEqual({ status: 'UNPAID', payments: ['PENDING'] });
  });

  it('SV hủy ở cổng VNPay → giao dịch FAILED, lần thử sau vẫn trả được', async () => {
    const cancelled = vnpayCallback((await pay(student, invoiceId, IP)).payUrl, {
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
    });
    expect(await confirm(cancelled)).toMatchObject({ rspCode: '00', paid: false });
    expect(await invoiceState()).toEqual({ status: 'UNPAID', payments: ['FAILED'] });

    const retry = vnpayCallback((await pay(student, invoiceId, IP)).payUrl);
    expect(await confirm(retry)).toMatchObject({ rspCode: '00', paid: true });
    expect(await invoiceState()).toEqual({ status: 'PAID', payments: ['FAILED', 'SUCCESS'] });
  });

  it('SV mở hai tab và trả cả hai → hóa đơn PAID một lần, giao dịch sau DUPLICATE, doanh thu chỉ tính một lần', async () => {
    const first = vnpayCallback((await pay(student, invoiceId, IP)).payUrl);
    const second = vnpayCallback((await pay(student, invoiceId, IP)).payUrl, { vnp_TransactionNo: '14123457' });
    expect(await confirm(first)).toMatchObject({ rspCode: '00', paid: true, duplicate: false });
    expect(await confirm(second)).toMatchObject({ rspCode: '00', paid: true, duplicate: true });
    expect(await confirm(second)).toMatchObject({ rspCode: '02', duplicate: true });
    expect(await invoiceState()).toEqual({ status: 'PAID', payments: ['DUPLICATE', 'SUCCESS'] });
    const month = currentMonthVN();
    expect((await revenue(await createAdmin(), { from: month, to: month })).total).toEqual({ roomFee: '1500000', utility: '0' });
  });

  it('hai giao dịch của cùng hóa đơn báo về cùng lúc → đúng một SUCCESS, một DUPLICATE', async () => {
    const first = vnpayCallback((await pay(student, invoiceId, IP)).payUrl);
    const second = vnpayCallback((await pay(student, invoiceId, IP)).payUrl, { vnp_TransactionNo: '14123457' });
    const results = await Promise.all([confirm(first), confirm(second)]);
    expect(results.map((r) => r.duplicate).sort()).toEqual([false, true]);
    expect(await invoiceState()).toEqual({ status: 'PAID', payments: ['DUPLICATE', 'SUCCESS'] });
  });
});

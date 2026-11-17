import { describe, expect, it } from 'vitest';
import { buildPayUrl, verifySignature, vnpDate } from '../src/utils/vnpay.js';

const SECRET = 'khoa-bi-mat';
const PARAMS = {
  vnp_Amount: '150000000',
  vnp_OrderInfo: 'Thanh toan hoa don INV-2026-0001',
  vnp_TmnCode: 'TESTCODE',
  vnp_TxnRef: 'abc123',
};

/** Query đúng như Express nhận được khi trình duyệt đi theo URL đã ký ("+" giải mã thành dấu cách). */
function signedQuery(params: Record<string, string> = PARAMS, secret = SECRET): Record<string, string> {
  return Object.fromEntries(new URL(buildPayUrl('https://vnpay.test/pay', params, secret)).searchParams);
}

describe('Chữ ký VNPay (utils/vnpay.ts)', () => {
  it('ký rồi verify lại thì đúng, kể cả mô tả có dấu cách', () => {
    expect(verifySignature(signedQuery(), SECRET)).toBe(true);
  });

  it('sửa bất kỳ tham số nào sau khi ký → sai chữ ký', () => {
    for (const key of Object.keys(PARAMS)) {
      expect(verifySignature({ ...signedQuery(), [key]: '1' }, SECRET), key).toBe(false);
    }
  });

  it('thêm tham số vnp_ không có lúc ký → sai chữ ký', () => {
    expect(verifySignature({ ...signedQuery(), vnp_BankCode: 'NCB' }, SECRET)).toBe(false);
  });

  it('ký bằng khóa khác hoặc thiếu vnp_SecureHash → sai chữ ký', () => {
    expect(verifySignature(signedQuery(PARAMS, 'khoa-khac'), SECRET)).toBe(false);
    const { vnp_SecureHash: _, ...unsigned } = signedQuery();
    expect(verifySignature(unsigned, SECRET)).toBe(false);
  });

  it('bỏ qua vnp_SecureHashType, tham số không phải vnp_ và chữ hoa/thường của chữ ký', () => {
    const query = signedQuery();
    expect(
      verifySignature(
        { ...query, vnp_SecureHash: query.vnp_SecureHash!.toUpperCase(), vnp_SecureHashType: 'HmacSHA512', utm: 'x' },
        SECRET,
      ),
    ).toBe(true);
  });

  it('vnpDate theo giờ Việt Nam — 17:30 UTC ngày 30/09 là 00:30 ngày 01/10', () => {
    expect(vnpDate(new Date('2026-09-30T17:30:00Z'))).toBe('20261001003000');
  });
});

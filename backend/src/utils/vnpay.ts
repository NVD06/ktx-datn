import { createHmac, timingSafeEqual } from 'node:crypto';

/*
 * Ký và kiểm tra chữ ký VNPay (API thanh toán 2.1.0) bằng `crypto` có sẵn của Node.
 * Chuỗi ký làm y hệt code mẫu Node.js của VNPay: sắp tham số theo tên, encode giá trị
 * (khoảng trắng thành "+"), nối "key=value" bằng "&" rồi HMAC-SHA512 với chuỗi bí mật.
 */

function signData(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key]!).replace(/%20/g, '+')}`)
    .join('&');
}

function hmac(data: string, secret: string) {
  return createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

/** URL chuyển SV sang cổng VNPay — chính chuỗi đã ký kèm thêm `vnp_SecureHash`. */
export function buildPayUrl(baseUrl: string, params: Record<string, string>, secret: string) {
  const data = signData(params);
  return `${baseUrl}?${data}&vnp_SecureHash=${hmac(data, secret)}`;
}

/** Query VNPay gửi về (ReturnURL / IPN) có đúng chữ ký không — sửa bất kỳ tham số nào là sai. */
export function verifySignature(query: Record<string, unknown>, secret: string) {
  const { vnp_SecureHash: hash, vnp_SecureHashType: _type, ...rest } = query;
  if (typeof hash !== 'string') return false;
  const params = Object.fromEntries(
    Object.entries(rest).filter((e): e is [string, string] => e[0].startsWith('vnp_') && typeof e[1] === 'string'),
  );
  const expected = Buffer.from(hmac(signData(params), secret));
  const actual = Buffer.from(hash.toLowerCase());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** "yyyyMMddHHmmss" theo giờ Việt Nam — định dạng của vnp_CreateDate / vnp_ExpireDate. */
export function vnpDate(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);
}

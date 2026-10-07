/** Đơn giá điện nước — xem docs/database.md §4. */
export const ELECTRIC_PRICE = 3_500; // đ/kWh
export const WATER_PRICE = 15_000; // đ/m³

/**
 * Quy tắc nửa tháng của tiền phòng: tháng ở dưới từng này ngày tính nửa tháng, từ đó trở lên tính cả tháng.
 * Giữ khớp với HALF_MONTH_DAYS ở frontend/src/features/contracts/contract-terms.ts.
 */
export const HALF_MONTH_DAYS = 15;

/** Số ngày mặc định từ lúc phát hành hóa đơn tới hạn thanh toán. */
export const INVOICE_DUE_DAYS = 14;

/** Giao dịch VNPay hết hạn sau từng này phút (vnp_ExpireDate) — quá hạn thì SV không trả tiếp được nữa. */
export const PAYMENT_EXPIRE_MINUTES = 15;

/**
 * Điểm vệ sinh dưới mức này là cảnh báo (US-05.5) — xét từng lần chấm, không xét "2 lần liên tiếp".
 * Giữ khớp với HYGIENE_WARNING_SCORE ở frontend/src/lib/labels.ts.
 */
export const HYGIENE_WARNING_SCORE = 60;

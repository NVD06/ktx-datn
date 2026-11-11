/** Đơn giá điện nước — xem docs/database.md §4. */
export const ELECTRIC_PRICE = 3_500; // đ/kWh
export const WATER_PRICE = 15_000; // đ/m³

/**
 * Quy tắc nửa tháng của tiền phòng: tháng ở dưới từng này ngày tính nửa tháng, từ đó trở lên tính cả tháng.
 * Giữ khớp với HALF_MONTH_DAYS ở frontend/src/features/contracts/contract-terms.ts.
 */
export const HALF_MONTH_DAYS = 15;

/**
 * Số ngày từ lúc phát hành hóa đơn tới hạn thanh toán: điện nước INVOICE_DUE_DAYS, tiền phòng ROOM_FEE_DUE_DAYS.
 * Giữ ROOM_FEE_DUE_DAYS khớp với frontend/src/features/contracts/contract-terms.ts.
 */
export const INVOICE_DUE_DAYS = 14;
export const ROOM_FEE_DUE_DAYS = 4;

/** Giao dịch VNPay hết hạn sau từng này phút (vnp_ExpireDate) — quá hạn thì SV không trả tiếp được nữa. */
export const PAYMENT_EXPIRE_MINUTES = 15;

/**
 * Điểm vệ sinh dưới mức này là cảnh báo (US-05.5) — xét từng lần chấm, không xét "2 lần liên tiếp".
 * Giữ khớp với HYGIENE_WARNING_SCORE ở frontend/src/lib/labels.ts.
 */
export const HYGIENE_WARNING_SCORE = 60;

export const HYGIENE_FULL_SCORE = 100;

/**
 * Mỗi kỳ nửa tháng phòng còn dưới HYGIENE_WARNING_SCORE thì SV ở phòng bị một dấu. Quá từng này dấu
 * trong hợp đồng thì đơn đăng ký, yêu cầu gia hạn bị gắn nhãn "không ưu tiên" để BQL xét.
 * Giữ khớp với HYGIENE_MARK_LIMIT ở frontend/src/lib/labels.ts.
 */
export const HYGIENE_MARK_LIMIT = 5;

export const HYGIENE_VIOLATIONS = {
  TRASH: { label: 'Rác', points: 5 },
  MESSY: { label: 'Bừa bộn', points: 3 },
  DIRTY_WC: { label: 'WC bẩn', points: 5 },
  CORRIDOR: { label: 'Hành lang', points: 3 },
  COOKING: { label: 'Nấu ăn', points: 10 },
  ABSENT: { label: 'Vắng mặt', points: 2 },
} as const;

/** Dashboard (US-06.1) đếm hợp đồng đang ở sẽ hết hạn trong từng này ngày tới. */
export const CONTRACT_EXPIRING_DAYS = 30;

export const LOGIN_LIMIT = 5;
export const LOGIN_IP_LIMIT = 30;
export const LOGIN_LIMIT_MINUTES = 15;

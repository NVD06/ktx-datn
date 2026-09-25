/**
 * Mốc thời gian theo giờ Việt Nam. Việt Nam không đổi giờ theo mùa nên lệch
 * UTC luôn đúng +7 — cộng/trừ thẳng là đủ, không cần thư viện múi giờ.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * 23:59:59.999 giờ Việt Nam của ngày chứa `date`. Dùng cho hạn chót: hạn ghi
 * ngày nào thì hết ngày đó mới tính là quá hạn, không phụ thuộc giờ tạo.
 */
export function endOfDayVN(date: Date): Date {
  // Dời sang "đồng hồ Việt Nam" để các trường UTC chính là ngày/giờ ở Việt Nam.
  const local = new Date(date.getTime() + VN_OFFSET_MS);
  local.setUTCHours(23, 59, 59, 999);
  return new Date(local.getTime() - VN_OFFSET_MS);
}

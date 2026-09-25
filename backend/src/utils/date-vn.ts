/**
 * Ngày giờ theo giờ Việt Nam. Việt Nam không đổi giờ theo mùa nên lệch UTC luôn
 * đúng +7 — cộng/trừ thẳng là đủ, không cần thư viện múi giờ.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Dời sang "đồng hồ Việt Nam": các trường UTC của kết quả chính là ngày/giờ ở Việt Nam. */
function toVN(date: Date) {
  return new Date(date.getTime() + VN_OFFSET_MS);
}

/**
 * 23:59:59.999 giờ Việt Nam của ngày chứa `date`. Dùng cho hạn chót: hạn ghi
 * ngày nào thì hết ngày đó mới tính là quá hạn, không phụ thuộc giờ tạo.
 */
export function endOfDayVN(date: Date): Date {
  const local = toVN(date);
  local.setUTCHours(23, 59, 59, 999);
  return new Date(local.getTime() - VN_OFFSET_MS);
}

/** Năm hiện tại ở Việt Nam — 00:30 ngày 01/01 đã thuộc năm mới. */
export function currentYearVN(): number {
  return toVN(new Date()).getUTCFullYear();
}

/** Ngày trong thông báo lỗi: "31/01/2027". */
export function formatDateVN(date: Date): string {
  const local = toVN(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

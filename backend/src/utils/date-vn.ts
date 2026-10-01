/**
 * Ngày giờ theo giờ Việt Nam. Việt Nam không đổi giờ theo mùa nên lệch UTC luôn
 * đúng +7 — cộng/trừ thẳng là đủ, không cần thư viện múi giờ.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Tháng hiện tại ở Việt Nam: "2026-09" — kỳ của hóa đơn điện nước. */
export function currentMonthVN(): string {
  return monthOfVN(new Date());
}

/** Tháng (giờ Việt Nam) chứa `date`: 00:30 ngày 01/10 giờ VN đã là "2026-10". */
export function monthOfVN(date: Date): string {
  return toVN(date).toISOString().slice(0, 7);
}

/** 00:00 giờ Việt Nam ngày đầu của tháng "2026-09". */
export function monthStartVN(period: string): Date {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, month - 1, 1) - VN_OFFSET_MS);
}

/** Tháng cách `period` `n` tháng: shiftMonth("2026-01", -1) = "2025-12". */
export function shiftMonth(period: string, n: number): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, month - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Số ngày theo lịch Việt Nam từ `from` tới `to`, tính cả hai đầu — 22/09 tới 30/09 là 9 ngày. */
export function calendarDaysVN(from: Date, to: Date): number {
  const day = (date: Date) => Math.floor(toVN(date).getTime() / DAY_MS);
  return day(to) - day(from) + 1;
}

/** 00:00 giờ Việt Nam ngày đầu của tháng SAU kỳ "2026-09" — mốc "trước khi hết tháng". */
export function nextMonthStartVN(period: string): Date {
  const [year, month] = period.split('-').map(Number) as [number, number];
  // Date.UTC nhận tháng tính từ 0, nên `month` (tính từ 1) chính là tháng kế tiếp.
  return new Date(Date.UTC(year, month, 1) - VN_OFFSET_MS);
}

/** Ngày trong thông báo lỗi: "31/01/2027". */
export function formatDateVN(date: Date): string {
  const local = toVN(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

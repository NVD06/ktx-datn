/**
 * Chuyển đổi giữa ISO của backend và chuỗi "YYYY-MM-DD" của <input type="date">.
 * Tính theo giờ máy người dùng — ngày hiển thị trong ô nhập khớp với formatDate().
 */

/** ISO -> "2026-09-01". */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "2026-09-01" -> ISO. `end` lấy 23:59:59 để ngày kết thúc tính trọn ngày đó. */
export function fromDateInput(date: string, edge: 'start' | 'end' = 'start'): string {
  return new Date(`${date}T${edge === 'start' ? '00:00:00' : '23:59:59'}`).toISOString()
}

/**
 * Định dạng dữ liệu hiển thị.
 * Mọi nơi hiển thị tiền/ngày đều dùng các hàm này — không tự gọi
 * toLocaleString rải rác, tránh mỗi màn hình một kiểu.
 */

/** 1500000 -> "1.500.000 đ" */
export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('vi-VN')} đ`
}

/** Date -> "07/09/2026" */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Date -> "07/09/2026 15:23" */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(d)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

/** Giá trị rỗng hiển thị thống nhất bằng dấu gạch, không để ô trắng. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

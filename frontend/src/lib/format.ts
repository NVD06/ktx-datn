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

/** Ngày theo giờ Việt Nam như backend, không theo giờ máy: "2026-11-09". */
export function dayVN(value: string | number = Date.now()): string {
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Ngày/tháng theo giờ Việt Nam: "09/11". */
export function formatDayMonthVN(value: string): string {
  const day = dayVN(value)
  return `${day.slice(8)}/${day.slice(5, 7)}`
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

/** "07/09/2026 – 31/01/2027" */
export function formatDateRange(start: Date | string, end: Date | string): string {
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** Giá trị rỗng hiển thị thống nhất bằng dấu gạch, không để ô trắng. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** Chỗ ở trong câu thông báo: "giường G1 · phòng 101 · tòa B1". */
export function bedPlace(bed: { code: string; room: { code: string; building: { name: string } } }): string {
  return `giường ${bed.code} · phòng ${bed.room.code} · tòa ${bed.room.building.name}`
}

/** "2026-09" -> "09/2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return `${m}/${year}`
}

/** 2500000 -> "2,5 Tr" — nhãn trục biểu đồ; số đầy đủ xem ở tooltip. */
export function formatMoneyCompact(value: number): string {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** (3, 200) -> "1,5%"; tổng bằng 0 -> "—" */
export function formatPercent(part: number, total: number): string {
  if (!total) return '—'
  return `${((part / total) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
}

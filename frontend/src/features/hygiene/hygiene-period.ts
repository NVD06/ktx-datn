import { shiftMonthInput } from '@/lib/date-input'
import { dayVN } from '@/lib/format'

/**
 * Kỳ điểm vệ sinh nửa tháng (1–15, 16–cuối tháng) theo giờ Việt Nam như backend, không theo giờ máy.
 * Khóa là ngày đầu kỳ: "2026-11-01", "2026-11-16".
 */
export function periodOf(iso: string) {
  const day = dayVN(iso)
  return `${day.slice(0, 8)}${Number(day.slice(8)) < 16 ? '01' : '16'}`
}

export function shiftPeriod(start: string, n: number) {
  const index = (start.endsWith('16') ? 1 : 0) + n
  return `${shiftMonthInput(start.slice(0, 7), Math.floor(index / 2))}-${index % 2 === 0 ? '01' : '16'}`
}

/** "01–15/11", "16–30/11". */
export function periodLabel(start: string) {
  const [year, month] = start.split('-').map(Number) as [number, number]
  const end = start.endsWith('01') ? 15 : new Date(year, month, 0).getDate()
  return `${start.slice(8)}–${end}/${start.slice(5, 7)}`
}

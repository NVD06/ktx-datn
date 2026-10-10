import { useState } from 'react'
import { useListParams } from '@/hooks/useListParams'
import { currentMonthInput, shiftMonthInput } from '@/lib/date-input'

/** Các lựa chọn "n tháng gần nhất" của trang báo cáo. */
export const RECENT_MONTH_OPTIONS = [3, 6, 12] as const
/** Mặc định — giống biểu đồ doanh thu ở Tổng quan; để mặc định thì không ghi lên URL. */
const DEFAULT_MONTHS = 6

/**
 * Xem `months` tháng gần nhất, tính cả tháng này — lưu trên URL (`?months=12`), giá trị gõ tay
 * ngoài danh sách thì về mặc định. `from`/`to` ("2026-05" → "2026-10") để gửi cho API.
 */
export function useRecentMonths() {
  const list = useListParams(['months'] as const)
  const [thisMonth] = useState(currentMonthInput)
  const raw = Number(list.filters.months)
  const months = (RECENT_MONTH_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_MONTHS

  return {
    months,
    from: shiftMonthInput(thisMonth, 1 - months),
    to: thisMonth,
    setMonths: (value: number) => list.setFilter('months', value === DEFAULT_MONTHS ? '' : String(value)),
  }
}

export type RecentMonths = ReturnType<typeof useRecentMonths>

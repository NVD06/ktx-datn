import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RECENT_MONTH_OPTIONS, type RecentMonths } from '../hooks/useRecentMonths'

/** Một ô chọn "3 / 6 / 12 tháng gần nhất" thay cho hai ô lịch từ tháng – đến tháng. */
export function RecentMonthsFilter({ range }: { range: RecentMonths }) {
  return (
    <Select value={String(range.months)} onValueChange={(value) => range.setMonths(Number(value))}>
      <SelectTrigger className="bg-card min-w-44" aria-label="Khoảng thời gian">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {RECENT_MONTH_OPTIONS.map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n} tháng gần nhất
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useListParams } from '@/hooks/useListParams'
import { currentMonthInput, shiftMonthInput } from '@/lib/date-input'
import { ReportPlaceholder, ReportSection } from '../components/ReportSection'

/** Mặc định xem từng này tháng gần nhất, tính cả tháng này — giống biểu đồ ở Tổng quan. */
const DEFAULT_MONTHS = 6

/**
 * Báo cáo doanh thu & công nợ (US-06.3). Khoảng tháng chỉ áp cho doanh thu (lưu trên URL, để
 * trống là 6 tháng gần nhất); công nợ là số còn nợ tại thời điểm xem nên không theo khoảng tháng.
 */
export function FinanceReportPage() {
  const list = useListParams(['from', 'to'] as const)
  const [thisMonth] = useState(currentMonthInput)
  const to = list.filters.to || thisMonth
  const from = list.filters.from || shiftMonthInput(to, 1 - DEFAULT_MONTHS)

  return (
    <div className="space-y-4">
      <ReportSection
        title="Doanh thu theo tháng"
        description="Tiền đã thu qua VNPay, tính theo tháng thanh toán, tách tiền phòng và điện nước."
        action={
          <div className="flex items-center gap-2 text-sm">
            <Input
              type="month"
              value={from}
              max={to}
              onChange={(e) => list.setFilter('from', e.target.value)}
              className="bg-card w-40"
              aria-label="Từ tháng"
            />
            <span className="text-muted-foreground">đến</span>
            <Input
              type="month"
              value={to}
              min={from}
              max={thisMonth}
              onChange={(e) => list.setFilter('to', e.target.value)}
              className="bg-card w-40"
              aria-label="Đến tháng"
            />
          </div>
        }
      >
        <ReportPlaceholder />
      </ReportSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Công nợ theo tòa" description="Hóa đơn chưa thanh toán và quá hạn của từng tòa.">
          <ReportPlaceholder />
        </ReportSection>
        <ReportSection title="Sinh viên còn nợ" description="Tổng tiền còn nợ từng sinh viên, bấm để xem hóa đơn.">
          <ReportPlaceholder />
        </ReportSection>
      </div>
    </div>
  )
}

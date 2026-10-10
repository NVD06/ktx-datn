import { RecentMonthsFilter } from '../components/RecentMonthsFilter'
import { ReportPlaceholder, ReportSection } from '../components/ReportSection'
import { useRecentMonths } from '../hooks/useRecentMonths'

/**
 * Báo cáo doanh thu & công nợ (US-06.3). Khoảng tháng chỉ áp cho doanh thu nên nằm trong khối
 * doanh thu; công nợ là số còn nợ tại thời điểm xem nên không theo khoảng tháng.
 */
export function FinanceReportPage() {
  const range = useRecentMonths()

  return (
    <div className="space-y-4">
      <ReportSection
        title="Doanh thu theo tháng"
        description="Tiền đã thu qua VNPay, tính theo tháng thanh toán, tách tiền phòng và điện nước."
        action={<RecentMonthsFilter range={range} />}
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

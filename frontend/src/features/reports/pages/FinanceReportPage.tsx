import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { BuildingDebtTable } from '../components/BuildingDebtTable'
import { DebtorTable } from '../components/DebtorTable'
import { RecentMonthsFilter } from '../components/RecentMonthsFilter'
import { ReportSection } from '../components/ReportSection'
import { RevenueTable } from '../components/RevenueTable'
import { useRecentMonths } from '../hooks/useRecentMonths'
import { useDebtReport, useRevenueReport } from '../hooks/useReports'

/**
 * Báo cáo doanh thu & công nợ (US-06.3). Khoảng tháng chỉ áp cho doanh thu nên nằm trong khối
 * doanh thu; công nợ là số còn nợ tại thời điểm xem nên không theo khoảng tháng.
 */
export function FinanceReportPage() {
  const range = useRecentMonths()
  const revenue = useRevenueReport(range.from, range.to)
  const debt = useDebtReport()

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-5">
        <ReportSection
          title="Doanh thu theo tháng"
          description="Tiền đã thu qua VNPay, tính theo tháng thanh toán, tách tiền phòng và điện nước."
          action={<RecentMonthsFilter range={range} />}
          className="xl:col-span-3"
        >
          {revenue.isPending && <LoadingState />}
          {revenue.isError && <ErrorState error={revenue.error} />}
          {revenue.data && <RevenueTable report={revenue.data} />}
        </ReportSection>
        <ReportSection
          title="Công nợ theo tòa"
          description="Hóa đơn chưa thanh toán và quá hạn của từng tòa."
          className="xl:col-span-2"
        >
          {debt.isPending && <LoadingState />}
          {debt.isError && <ErrorState error={debt.error} />}
          {debt.data?.length === 0 && <EmptyState description="Chưa có tòa nhà nào." />}
          {!!debt.data?.length && <BuildingDebtTable rows={debt.data} />}
        </ReportSection>
      </div>
      <ReportSection
        title="Sinh viên còn nợ"
        description="Quá hạn nhiều tiền nhất lên đầu, mở menu cuối dòng để xem hóa đơn."
      >
        <DebtorTable />
      </ReportSection>
    </div>
  )
}

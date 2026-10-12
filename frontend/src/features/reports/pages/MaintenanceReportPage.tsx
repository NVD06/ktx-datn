import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { HYGIENE_WARNING_SCORE } from '@/lib/labels'
import { LowScoreTable, RequestMonthTable } from '../components/MaintenanceTables'
import { RecentMonthsFilter } from '../components/RecentMonthsFilter'
import { ReportSection } from '../components/ReportSection'
import { useRecentMonths } from '../hooks/useRecentMonths'
import { useMaintenanceReport } from '../hooks/useReports'
export function MaintenanceReportPage() {
  const range = useRecentMonths()
  const report = useMaintenanceReport(range.from, range.to)
  const data = report.data
  return (
    <div className="space-y-4">
      <div className="flex">
        <RecentMonthsFilter range={range} />
      </div>
      {report.isPending && <LoadingState />}
      {report.isError && <ErrorState error={report.error} />}
      {data && (
        <div className="grid items-start gap-4 xl:grid-cols-5">
          <ReportSection
            title="Yêu cầu sửa chữa"
            description="Số yêu cầu theo trạng thái hiện tại, chia theo tháng gửi."
            className="xl:col-span-3"
          >
            <RequestMonthTable requests={data.requests} />
          </ReportSection>
          <ReportSection
            title={`Phòng dưới ${HYGIENE_WARNING_SCORE} điểm`}
            description="Các lần chấm dưới ngưỡng cảnh báo, mới nhất trước."
            className="xl:col-span-2"
          >
            {data.lowScores.length === 0 ? (
              <EmptyState title={`Không có lần chấm nào dưới ${HYGIENE_WARNING_SCORE} điểm`} />
            ) : (
              <LowScoreTable rows={data.lowScores} />
            )}
          </ReportSection>
        </div>
      )}
    </div>
  )
}

import { HYGIENE_WARNING_SCORE } from '@/lib/labels'
import { RecentMonthsFilter } from '../components/RecentMonthsFilter'
import { ReportPlaceholder, ReportSection } from '../components/ReportSection'
import { useRecentMonths } from '../hooks/useRecentMonths'

/**
 * Báo cáo sửa chữa & vệ sinh (US-06.4): hai khối sửa chữa ở trên, hai khối vệ sinh ở dưới.
 * Khoảng tháng (chốt 10/10) áp cho cả bốn khối nên đặt trên đầu trang: yêu cầu tính theo tháng
 * gửi, điểm vệ sinh theo ngày chấm.
 */
export function MaintenanceReportPage() {
  const range = useRecentMonths()

  return (
    <div className="space-y-4">
      <div className="flex">
        <RecentMonthsFilter range={range} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Yêu cầu sửa chữa" description="Số yêu cầu theo trạng thái và theo tháng gửi.">
          <ReportPlaceholder />
        </ReportSection>
        <ReportSection
          title="Thời gian xử lý trung bình"
          description="Từ lúc gửi tới lúc sửa xong, tính trên các yêu cầu đã xong hoặc đã xác nhận."
        >
          <ReportPlaceholder />
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Điểm vệ sinh trung bình theo tòa" description="Trung bình các lần chấm của từng tòa.">
          <ReportPlaceholder />
        </ReportSection>
        <ReportSection
          title={`Phòng dưới ${HYGIENE_WARNING_SCORE} điểm`}
          description="Các phòng có lần chấm dưới ngưỡng cảnh báo."
        >
          <ReportPlaceholder />
        </ReportSection>
      </div>
    </div>
  )
}

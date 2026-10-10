import { HYGIENE_WARNING_SCORE } from '@/lib/labels'
import { ReportPlaceholder, ReportSection } from '../components/ReportSection'

/** Báo cáo sửa chữa & vệ sinh (US-06.4): hai khối sửa chữa ở trên, hai khối vệ sinh ở dưới. */
export function MaintenanceReportPage() {
  return (
    <div className="space-y-4">
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

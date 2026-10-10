import { useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/api/reports'
import { REPORT_STALE_TIME, reportKeys } from '@/features/reports/hooks/useReports'

/**
 * Số liệu tổng hợp trên nhiều bảng, không cần tươi từng giây — giữ 1 phút (us-06.md, ghi chú
 * kỹ thuật) thay vì mặc định tải lại mỗi lần quay về trang.
 */
export function useOverviewReport() {
  return useQuery({
    queryKey: reportKeys.overview,
    queryFn: reportsApi.getOverviewReport,
    staleTime: REPORT_STALE_TIME,
  })
}

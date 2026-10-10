import { useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/api/reports'

/** Mọi số liệu thống kê (US-06) — Tổng quan và các trang báo cáo dùng chung tiền tố 'reports'. */
export const reportKeys = {
  overview: ['reports', 'overview'] as const,
  occupancy: (buildingId: string) => ['reports', 'occupancy', buildingId] as const,
}

/** Số liệu tổng hợp không cần tươi từng giây — giữ 1 phút (us-06.md, ghi chú kỹ thuật). */
export const REPORT_STALE_TIME = 60_000

/** `buildingId` rỗng = mọi tòa trong phạm vi. */
export function useOccupancyReport(buildingId: string) {
  return useQuery({
    queryKey: reportKeys.occupancy(buildingId),
    queryFn: () => reportsApi.getOccupancyReport(buildingId || undefined),
    staleTime: REPORT_STALE_TIME,
  })
}

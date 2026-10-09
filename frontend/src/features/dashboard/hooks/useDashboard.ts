import { useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/api/reports'

export const reportKeys = {
  overview: ['reports', 'overview'] as const,
}

/**
 * Số liệu tổng hợp trên nhiều bảng, không cần tươi từng giây — giữ 1 phút (us-06.md, ghi chú
 * kỹ thuật) thay vì mặc định tải lại mỗi lần quay về trang.
 */
export function useOverviewReport() {
  return useQuery({ queryKey: reportKeys.overview, queryFn: reportsApi.getOverviewReport, staleTime: 60_000 })
}

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/api/reports'
import type { ListParams } from '@/types/api'

/** Mọi số liệu thống kê (US-06) — Tổng quan và các trang báo cáo dùng chung tiền tố 'reports'. */
export const reportKeys = {
  overview: ['reports', 'overview'] as const,
  occupancy: (buildingId: string) => ['reports', 'occupancy', buildingId] as const,
  revenue: (from: string, to: string) => ['reports', 'revenue', from, to] as const,
  debt: ['reports', 'debt'] as const,
  debtors: (params: ListParams) => ['reports', 'debtors', params] as const,
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
export function useRevenueReport(from: string, to: string) {
  return useQuery({
    queryKey: reportKeys.revenue(from, to),
    queryFn: () => reportsApi.getRevenueReport(from, to),
    staleTime: REPORT_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}
export function useDebtReport() {
  return useQuery({ queryKey: reportKeys.debt, queryFn: reportsApi.getDebtReport, staleTime: REPORT_STALE_TIME })
}
export function useDebtors(params: ListParams) {
  return useQuery({
    queryKey: reportKeys.debtors(params),
    queryFn: () => reportsApi.listDebtors(params),
    staleTime: REPORT_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

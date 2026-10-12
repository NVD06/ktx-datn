import { apiGet, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { BuildingDebt, Debtor, OccupancyBuilding, OverviewReport, RevenueReport } from '@/types/report'

/** Số liệu dashboard — ADMIN/MANAGER, backend tự giới hạn MANAGER theo tòa mình. */
export function getOverviewReport() {
  return apiGet<OverviewReport>('/reports/overview')
}

/** Lấp đầy theo tòa → tầng → phòng; bỏ `buildingId` thì mọi tòa trong phạm vi. */
export function getOccupancyReport(buildingId?: string) {
  return apiGet<OccupancyBuilding[]>('/reports/occupancy', { buildingId })
}
export function getRevenueReport(from: string, to: string) {
  return apiGet<RevenueReport>('/reports/revenue', { from, to })
}
export function getDebtReport() {
  return apiGet<BuildingDebt[]>('/reports/debt')
}
export function listDebtors(params: ListParams) {
  return getPaged<Debtor>('/reports/debt/students', params)
}

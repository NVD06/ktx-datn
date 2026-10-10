import { apiGet } from './client'
import type { OccupancyBuilding, OverviewReport } from '@/types/report'

/** Số liệu dashboard — ADMIN/MANAGER, backend tự giới hạn MANAGER theo tòa mình. */
export function getOverviewReport() {
  return apiGet<OverviewReport>('/reports/overview')
}

/** Lấp đầy theo tòa → tầng → phòng; bỏ `buildingId` thì mọi tòa trong phạm vi. */
export function getOccupancyReport(buildingId?: string) {
  return apiGet<OccupancyBuilding[]>('/reports/occupancy', { buildingId })
}

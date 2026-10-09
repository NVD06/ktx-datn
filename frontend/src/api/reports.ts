import { apiGet } from './client'
import type { OverviewReport } from '@/types/report'

/** Số liệu dashboard — ADMIN/MANAGER, backend tự giới hạn MANAGER theo tòa mình. */
export function getOverviewReport() {
  return apiGet<OverviewReport>('/reports/overview')
}

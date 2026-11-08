import { apiGet, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type {
  MaintenanceInput,
  MaintenanceRequest,
  MaintenanceStats,
  UpdateMaintenanceStatusInput,
} from '@/types/maintenance'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa. `status=OPEN` lấy các yêu cầu chưa sửa xong. */
export function listMaintenanceRequests(params: ListParams) {
  return getPaged<MaintenanceRequest>('/maintenance-requests', params)
}

export function getMaintenanceStats(buildingId?: string) {
  return apiGet<MaintenanceStats>('/maintenance-requests/stats', { buildingId })
}

/** Yêu cầu của sinh viên đang đăng nhập, mới nhất trước. */
export function listMyMaintenanceRequests() {
  return apiGet<MaintenanceRequest[]>('/maintenance-requests/me')
}

/** Phòng do backend lấy từ hợp đồng đang ở — sinh viên không chọn phòng. */
export function createMaintenanceRequest(input: MaintenanceInput) {
  return apiPost<MaintenanceRequest>('/maintenance-requests', input)
}

export function updateMaintenanceStatus(id: string, input: UpdateMaintenanceStatusInput) {
  return apiPatch<MaintenanceRequest>(`/maintenance-requests/${id}/status`, input)
}

export function confirmMaintenanceRequest(id: string) {
  return apiPost<MaintenanceRequest>(`/maintenance-requests/${id}/confirm`)
}

import { apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { Contract, CurrentStay } from '@/types/contract'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa; `status` là trạng thái thực tế. */
export function listContracts(params: ListParams) {
  return getPaged<Contract>('/contracts', params)
}

/** Hợp đồng của sinh viên đang đăng nhập, mới nhất trước. */
export function listMyContracts() {
  return apiGet<Contract[]>('/contracts/me')
}

/** Hợp đồng đang ở (hoặc sắp ở) kèm bạn cùng phòng; null = chưa có chỗ ở. */
export function getCurrentStay() {
  return apiGet<CurrentStay | null>('/contracts/me/current')
}

export function getContract(id: string) {
  return apiGet<Contract>(`/contracts/${id}`)
}

/** Sinh viên ký: hợp đồng có hiệu lực, giường có người. Tiền phòng lập hằng tháng, không lập lúc ký. */
export function signContract(id: string) {
  return apiPost<Contract>(`/contracts/${id}/sign`)
}

/**
 * Kết thúc hợp đồng kèm lý do, giường trả lại ngay: `decline` — SV từ chối ký ·
 * `cancel` — Manager hủy hợp đồng chờ ký (lý do ghi cả vào đơn đăng ký) ·
 * `terminate` — Manager chấm dứt hợp đồng đang ở / trả phòng.
 */
export function endContract(id: string, action: ContractEndAction, reason: string) {
  return apiPost<Contract>(`/contracts/${id}/${action}`, { reason })
}

export type ContractEndAction = 'decline' | 'cancel' | 'terminate' | 'extension-request/reject'

/** Manager gia hạn — chỉ lùi ngày kết thúc, tháng ở thêm lập hóa đơn hằng tháng như thường. `endDate` là ISO. */
export function extendContract(id: string, endDate: string) {
  return apiPost<Contract>(`/contracts/${id}/extend`, { endDate })
}
export function requestExtension(id: string, endDate: string) {
  return apiPost<Contract>(`/contracts/${id}/extension-request`, { endDate })
}

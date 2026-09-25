import { apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { Contract } from '@/types/contract'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa; `status` là trạng thái thực tế. */
export function listContracts(params: ListParams) {
  return getPaged<Contract>('/contracts', params)
}

/** Hợp đồng của sinh viên đang đăng nhập, mới nhất trước. */
export function listMyContracts() {
  return apiGet<Contract[]>('/contracts/me')
}

export function getContract(id: string) {
  return apiGet<Contract>(`/contracts/${id}`)
}

/** Sinh viên ký: hợp đồng có hiệu lực, giường có người, sinh hóa đơn tiền phòng. */
export function signContract(id: string) {
  return apiPost<Contract>(`/contracts/${id}/sign`)
}

/**
 * Hủy hợp đồng chờ ký, giường trả lại ngay: `decline` — sinh viên từ chối ký ·
 * `cancel` — Manager hủy (lý do ghi cả vào phản hồi của đơn đăng ký).
 */
export function cancelContract(id: string, mode: 'decline' | 'cancel', reason: string) {
  return apiPost<Contract>(`/contracts/${id}/${mode}`, { reason })
}

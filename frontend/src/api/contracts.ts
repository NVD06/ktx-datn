import { apiGet, apiPost } from './client'
import type { Contract } from '@/types/contract'

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

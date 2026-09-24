import { apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { ApprovedContract } from '@/types/contract'
import type { Registration, RegistrationInput, RegistrationListItem } from '@/types/registration'

/** ADMIN/MANAGER — đơn trong phạm vi tòa được xem, backend tự lọc theo vai trò. */
export function listRegistrations(params: ListParams) {
  return getPaged<RegistrationListItem>('/registrations', params)
}

/** Đơn của sinh viên đang đăng nhập, mới nhất trước. */
export function listMyRegistrations() {
  return apiGet<Registration[]>('/registrations/me')
}

export function createRegistration(input: RegistrationInput) {
  return apiPost<Registration>('/registrations', input)
}

export function cancelRegistration(id: string) {
  return apiPost<Registration>(`/registrations/${id}/cancel`)
}

/** Duyệt đơn: xếp vào giường `bedId`, backend sinh hợp đồng DRAFT chờ sinh viên ký. */
export function approveRegistration(id: string, bedId: string) {
  return apiPost<ApprovedContract>(`/registrations/${id}/approve`, { bedId })
}

export function rejectRegistration(id: string, reviewNote: string) {
  return apiPost<RegistrationListItem>(`/registrations/${id}/reject`, { reviewNote })
}

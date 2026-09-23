import { api, apiGet, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { RegistrationPeriod, RegistrationPeriodInput } from '@/types/registration'

export function listRegistrationPeriods(params: ListParams) {
  return getPaged<RegistrationPeriod>('/registration-periods', params)
}

/** Đợt đang mở, `null` nếu không có. */
export function getCurrentRegistrationPeriod() {
  return apiGet<RegistrationPeriod | null>('/registration-periods/current')
}

export function createRegistrationPeriod(input: RegistrationPeriodInput) {
  return apiPost<RegistrationPeriod>('/registration-periods', input)
}

export function updateRegistrationPeriod(id: string, input: Partial<RegistrationPeriodInput>) {
  return apiPatch<RegistrationPeriod>(`/registration-periods/${id}`, input)
}

export function openRegistrationPeriod(id: string) {
  return apiPost<RegistrationPeriod>(`/registration-periods/${id}/open`)
}

export function closeRegistrationPeriod(id: string) {
  return apiPost<RegistrationPeriod>(`/registration-periods/${id}/close`)
}

export async function deleteRegistrationPeriod(id: string) {
  await api.delete(`/registration-periods/${id}`)
}

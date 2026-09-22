import { api, getPaged } from './client'
import type { ListParams, SuccessResponse } from '@/types/api'
import type { RegistrationPeriod, RegistrationPeriodInput } from '@/types/registration'

export function listRegistrationPeriods(params: ListParams) {
  return getPaged<RegistrationPeriod>('/registration-periods', params)
}

/** Đợt đang mở, `null` nếu không có. */
export async function getCurrentRegistrationPeriod() {
  const res = await api.get<SuccessResponse<RegistrationPeriod | null>>('/registration-periods/current')
  return res.data.data
}

export async function createRegistrationPeriod(input: RegistrationPeriodInput) {
  const res = await api.post<SuccessResponse<RegistrationPeriod>>('/registration-periods', input)
  return res.data.data
}

export async function updateRegistrationPeriod(id: string, input: Partial<RegistrationPeriodInput>) {
  const res = await api.patch<SuccessResponse<RegistrationPeriod>>(`/registration-periods/${id}`, input)
  return res.data.data
}

export async function openRegistrationPeriod(id: string) {
  const res = await api.post<SuccessResponse<RegistrationPeriod>>(`/registration-periods/${id}/open`)
  return res.data.data
}

export async function closeRegistrationPeriod(id: string) {
  const res = await api.post<SuccessResponse<RegistrationPeriod>>(`/registration-periods/${id}/close`)
  return res.data.data
}

export async function deleteRegistrationPeriod(id: string) {
  await api.delete(`/registration-periods/${id}`)
}

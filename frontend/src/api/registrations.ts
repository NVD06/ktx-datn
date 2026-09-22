import { api } from './client'
import type { SuccessResponse } from '@/types/api'
import type { Registration, RegistrationInput } from '@/types/registration'

/** Đơn của sinh viên đang đăng nhập, mới nhất trước. */
export async function listMyRegistrations() {
  const res = await api.get<SuccessResponse<Registration[]>>('/registrations/me')
  return res.data.data
}

export async function createRegistration(input: RegistrationInput) {
  const res = await api.post<SuccessResponse<Registration>>('/registrations', input)
  return res.data.data
}

export async function cancelRegistration(id: string) {
  const res = await api.post<SuccessResponse<Registration>>(`/registrations/${id}/cancel`)
  return res.data.data
}

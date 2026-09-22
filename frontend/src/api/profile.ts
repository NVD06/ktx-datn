import { api } from './client'
import type { SuccessResponse } from '@/types/api'
import type { ProfileInput, StudentProfile } from '@/types/profile'

export async function getProfile() {
  const res = await api.get<SuccessResponse<StudentProfile>>('/profile')
  return res.data.data
}

export async function updateProfile(input: ProfileInput) {
  const res = await api.patch<SuccessResponse<StudentProfile>>('/profile', input)
  return res.data.data
}

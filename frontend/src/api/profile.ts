import { apiGet, apiPatch } from './client'
import type { ProfileInput, StudentProfile } from '@/types/profile'

export function getProfile() {
  return apiGet<StudentProfile>('/profile')
}

export function updateProfile(input: ProfileInput) {
  return apiPatch<StudentProfile>('/profile', input)
}

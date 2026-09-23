import { apiPatch, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { UserSummary } from '@/types/user'

export function listUsers(params: ListParams) {
  return getPaged<UserSummary>('/users', params)
}

/** Hiện chỉ dùng để gán Manager vào tòa. `buildingId: null` = gỡ khỏi tòa. */
export function updateUser(id: string, input: { buildingId: string | null }) {
  return apiPatch<UserSummary>(`/users/${id}`, input)
}

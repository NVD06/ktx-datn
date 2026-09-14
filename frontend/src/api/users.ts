import { api, getPaged } from './client'
import type { ListParams, SuccessResponse } from '@/types/api'
import type { UserSummary } from '@/types/user'

export function listUsers(params: ListParams) {
  return getPaged<UserSummary>('/users', params)
}

/** Hiện chỉ dùng để gán Manager vào tòa. `buildingId: null` = gỡ khỏi tòa. */
export async function updateUser(id: string, input: { buildingId: string | null }) {
  const res = await api.patch<SuccessResponse<UserSummary>>(`/users/${id}`, input)
  return res.data.data
}

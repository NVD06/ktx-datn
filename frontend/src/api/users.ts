import { apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { CreateManagerInput, UserSummary, UserUpdateInput } from '@/types/user'

export function listUsers(params: ListParams) {
  return getPaged<UserSummary>('/users', params)
}

/** Admin tạo tài khoản quản lý — vai trò luôn MANAGER, backend không nhận `role`. */
export function createManager(input: CreateManagerInput) {
  return apiPost<UserSummary>('/users', input)
}

/** Gán/gỡ tòa (`buildingId: null` = gỡ) hoặc khóa/mở khóa (`isActive`). */
export function updateUser(id: string, input: UserUpdateInput) {
  return apiPatch<UserSummary>(`/users/${id}`, input)
}

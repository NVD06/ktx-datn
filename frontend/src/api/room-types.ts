import { api, getPaged } from './client'
import type { ListParams, SuccessResponse } from '@/types/api'
import type { RoomType, RoomTypeInput } from '@/types/facility'

export function listRoomTypes(params: ListParams) {
  return getPaged<RoomType>('/room-types', params)
}

export async function createRoomType(input: RoomTypeInput) {
  const res = await api.post<SuccessResponse<RoomType>>('/room-types', input)
  return res.data.data
}

export async function updateRoomType(id: string, input: Partial<RoomTypeInput>) {
  const res = await api.patch<SuccessResponse<RoomType>>(`/room-types/${id}`, input)
  return res.data.data
}

export async function deleteRoomType(id: string) {
  await api.delete(`/room-types/${id}`)
}

import { api, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { RoomType, RoomTypeInput } from '@/types/facility'

export function listRoomTypes(params: ListParams) {
  return getPaged<RoomType>('/room-types', params)
}

export function createRoomType(input: RoomTypeInput) {
  return apiPost<RoomType>('/room-types', input)
}

export function updateRoomType(id: string, input: Partial<RoomTypeInput>) {
  return apiPatch<RoomType>(`/room-types/${id}`, input)
}

export async function deleteRoomType(id: string) {
  await api.delete(`/room-types/${id}`)
}

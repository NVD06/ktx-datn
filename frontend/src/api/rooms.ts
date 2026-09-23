import { api, apiGet, apiPatch, apiPost } from './client'
import type {
  AvailableSummary,
  Bed,
  BedUpdateInput,
  RoomDetail,
  RoomInput,
  RoomUpdateInput,
} from '@/types/facility'

export function getRoom(id: string) {
  return apiGet<RoomDetail>(`/rooms/${id}`)
}

/** Tạo phòng — backend tự sinh giường theo sức chứa của loại phòng. */
export function createRoom(input: RoomInput) {
  return apiPost<RoomDetail>('/rooms', input)
}

export function updateRoom(id: string, input: RoomUpdateInput) {
  return apiPatch<RoomDetail>(`/rooms/${id}`, input)
}

export async function deleteRoom(id: string) {
  await api.delete(`/rooms/${id}`)
}

export function getAvailableSummary() {
  return apiGet<AvailableSummary[]>('/rooms/available/summary')
}

// ── Giường ────────────────────────────────────────────────────────────────

/** Không truyền `code` thì backend tự lấy mã trống nhỏ nhất (G1, G2…). */
export function createBed(roomId: string) {
  return apiPost<Bed>(`/rooms/${roomId}/beds`, {})
}

export function updateBed(id: string, input: BedUpdateInput) {
  return apiPatch<Bed>(`/beds/${id}`, input)
}

export async function deleteBed(id: string) {
  await api.delete(`/beds/${id}`)
}

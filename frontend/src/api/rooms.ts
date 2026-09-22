import { api } from './client'
import type { SuccessResponse } from '@/types/api'
import type {
  AvailableSummary,
  Bed,
  BedUpdateInput,
  RoomDetail,
  RoomInput,
  RoomUpdateInput,
} from '@/types/facility'

export async function getRoom(id: string) {
  const res = await api.get<SuccessResponse<RoomDetail>>(`/rooms/${id}`)
  return res.data.data
}

/** Tạo phòng — backend tự sinh giường theo sức chứa của loại phòng. */
export async function createRoom(input: RoomInput) {
  const res = await api.post<SuccessResponse<RoomDetail>>('/rooms', input)
  return res.data.data
}

export async function updateRoom(id: string, input: RoomUpdateInput) {
  const res = await api.patch<SuccessResponse<RoomDetail>>(`/rooms/${id}`, input)
  return res.data.data
}

export async function deleteRoom(id: string) {
  await api.delete(`/rooms/${id}`)
}

export async function getAvailableSummary() {
  const res = await api.get<SuccessResponse<AvailableSummary[]>>('/rooms/available/summary')
  return res.data.data
}

// ── Giường ────────────────────────────────────────────────────────────────

/** Không truyền `code` thì backend tự lấy mã trống nhỏ nhất (G1, G2…). */
export async function createBed(roomId: string) {
  const res = await api.post<SuccessResponse<Bed>>(`/rooms/${roomId}/beds`, {})
  return res.data.data
}

export async function updateBed(id: string, input: BedUpdateInput) {
  const res = await api.patch<SuccessResponse<Bed>>(`/beds/${id}`, input)
  return res.data.data
}

export async function deleteBed(id: string) {
  await api.delete(`/beds/${id}`)
}

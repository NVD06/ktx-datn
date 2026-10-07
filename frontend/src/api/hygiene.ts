import { api, apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { HygieneRecord, HygieneSheet, SaveHygieneInput, SaveHygieneResult } from '@/types/hygiene'

/** Bảng điểm — ADMIN/MANAGER, backend tự giới hạn theo tòa. `belowWarning=true` chỉ các lần chấm dưới 60 điểm. */
export function listHygieneRecords(params: ListParams) {
  return getPaged<HygieneRecord>('/hygiene-records', params)
}

/** Điểm các phòng sinh viên đã ở, chỉ trong thời gian ở đó — mới nhất trước. */
export function listMyHygieneRecords() {
  return apiGet<HygieneRecord[]>('/hygiene-records/me')
}

export function getHygieneSheet(buildingId: string, checkDate: string) {
  return apiGet<HygieneSheet>('/hygiene-records/sheet', { buildingId, checkDate })
}

/** Phòng đã có điểm ngày đó thì ghi đè. */
export function saveHygiene(input: SaveHygieneInput) {
  return apiPost<SaveHygieneResult>('/hygiene-records', input)
}

export async function deleteHygieneRecord(id: string) {
  await api.delete(`/hygiene-records/${id}`)
}

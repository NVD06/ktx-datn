import { api, getPaged } from './client'
import type { ListParams, SuccessResponse } from '@/types/api'
import type { Building, BuildingInput, Room } from '@/types/facility'

export function listBuildings(params: ListParams) {
  return getPaged<Building>('/buildings', params)
}

export async function getBuilding(id: string) {
  const res = await api.get<SuccessResponse<Building>>(`/buildings/${id}`)
  return res.data.data
}

export async function createBuilding(input: BuildingInput) {
  const res = await api.post<SuccessResponse<Building>>('/buildings', input)
  return res.data.data
}

export async function updateBuilding(id: string, input: Partial<BuildingInput>) {
  const res = await api.patch<SuccessResponse<Building>>(`/buildings/${id}`, input)
  return res.data.data
}

export async function deleteBuilding(id: string) {
  await api.delete(`/buildings/${id}`)
}

export function listBuildingRooms(buildingId: string, params: ListParams) {
  return getPaged<Room>(`/buildings/${buildingId}/rooms`, params)
}

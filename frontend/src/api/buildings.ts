import { api, apiGet, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { Building, BuildingInput, Room } from '@/types/facility'

export function listBuildings(params: ListParams) {
  return getPaged<Building>('/buildings', params)
}

export function getBuilding(id: string) {
  return apiGet<Building>(`/buildings/${id}`)
}

export function createBuilding(input: BuildingInput) {
  return apiPost<Building>('/buildings', input)
}

export function updateBuilding(id: string, input: Partial<BuildingInput>) {
  return apiPatch<Building>(`/buildings/${id}`, input)
}

export async function deleteBuilding(id: string) {
  await api.delete(`/buildings/${id}`)
}

export function listBuildingRooms(buildingId: string, params: ListParams) {
  return getPaged<Room>(`/buildings/${buildingId}/rooms`, params)
}

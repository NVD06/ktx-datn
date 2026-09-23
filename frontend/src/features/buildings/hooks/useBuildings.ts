import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as buildingsApi from '@/api/buildings'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { BuildingInput } from '@/types/facility'

export const buildingKeys = {
  all: ['buildings'] as const,
  list: (params: ListParams) => ['buildings', 'list', params] as const,
  detail: (id: string) => ['buildings', 'detail', id] as const,
}

export function useBuildings(params: ListParams) {
  return useQuery({
    queryKey: buildingKeys.list(params),
    queryFn: () => buildingsApi.listBuildings(params),
    placeholderData: keepPreviousData,
  })
}

export function useBuilding(id: string) {
  return useQuery({
    queryKey: buildingKeys.detail(id),
    queryFn: () => buildingsApi.getBuilding(id),
    enabled: !!id,
  })
}

export function useSaveBuilding() {
  const invalidate = useInvalidate(buildingKeys.all)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BuildingInput }) =>
      id ? buildingsApi.updateBuilding(id, input) : buildingsApi.createBuilding(input),
    onSuccess: invalidate,
  })
}

export function useDeleteBuilding() {
  const invalidate = useInvalidate(buildingKeys.all)
  return useMutation({ mutationFn: buildingsApi.deleteBuilding, onSuccess: invalidate })
}

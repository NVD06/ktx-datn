import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as maintenanceApi from '@/api/maintenance'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { UpdateMaintenanceStatusInput } from '@/types/maintenance'

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  list: (params: ListParams) => ['maintenance', 'list', params] as const,
  mine: ['maintenance', 'mine'] as const,
}

export function useMaintenanceRequests(params: ListParams) {
  return useQuery({
    queryKey: maintenanceKeys.list(params),
    queryFn: () => maintenanceApi.listMaintenanceRequests(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyMaintenanceRequests() {
  return useQuery({ queryKey: maintenanceKeys.mine, queryFn: maintenanceApi.listMyMaintenanceRequests })
}

export function useCreateMaintenanceRequest() {
  const invalidate = useInvalidate(maintenanceKeys.all)
  return useMutation({ mutationFn: maintenanceApi.createMaintenanceRequest, onSuccess: invalidate })
}

/**
 * Chuyển trạng thái. Làm mới cả khi LỖI: 409 nghĩa là người khác vừa xử lý yêu cầu này,
 * tải lại bảng để thấy trạng thái thật.
 */
export function useUpdateMaintenanceStatus() {
  const invalidate = useInvalidate(maintenanceKeys.all)
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMaintenanceStatusInput & { id: string }) =>
      maintenanceApi.updateMaintenanceStatus(id, input),
    onSettled: invalidate,
  })
}

export function useConfirmMaintenanceRequest() {
  const invalidate = useInvalidate(maintenanceKeys.all)
  return useMutation({ mutationFn: maintenanceApi.confirmMaintenanceRequest, onSettled: invalidate })
}

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as contractsApi from '@/api/contracts'
import { registrationKeys } from '@/features/registrations/hooks/useRegistrations'
import { roomKeys } from '@/features/rooms/hooks/useRooms'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

export const contractKeys = {
  all: ['contracts'] as const,
  list: (params: ListParams) => ['contracts', 'list', params] as const,
  mine: ['contracts', 'mine'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
}

/** Bảng hợp đồng của ADMIN/MANAGER. */
export function useContracts(params: ListParams) {
  return useQuery({
    queryKey: contractKeys.list(params),
    queryFn: () => contractsApi.listContracts(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyContracts() {
  return useQuery({ queryKey: contractKeys.mine, queryFn: contractsApi.listMyContracts })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => contractsApi.getContract(id),
    enabled: !!id,
  })
}

/** Làm mới cả khi lỗi: 409 nghĩa là trạng thái trên màn hình đã cũ (đã ký ở tab khác, đã hết hạn…). */
export function useSignContract() {
  const invalidate = useInvalidate(contractKeys.all)
  return useMutation({ mutationFn: contractsApi.signContract, onSettled: invalidate })
}

/**
 * Hủy hợp đồng chờ ký — SV từ chối (`decline`) hoặc Manager hủy (`cancel`).
 * Đơn đăng ký chuyển "Đã hủy" và giường trống lại, nên làm mới cả đơn và chỗ trống.
 */
export function useCancelContract(mode: 'decline' | 'cancel') {
  const invalidate = useInvalidate(contractKeys.all, registrationKeys.all, roomKeys.all)
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      contractsApi.cancelContract(id, mode, reason),
    onSettled: invalidate,
  })
}

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as contractsApi from '@/api/contracts'
import type { ContractEndAction } from '@/api/contracts'
import { invoiceKeys } from '@/features/invoices/hooks/useInvoices'
import { registrationKeys } from '@/features/registrations/hooks/useRegistrations'
import { roomKeys } from '@/features/rooms/hooks/useRooms'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

export const contractKeys = {
  all: ['contracts'] as const,
  list: (params: ListParams) => ['contracts', 'list', params] as const,
  mine: ['contracts', 'mine'] as const,
  current: ['contracts', 'mine', 'current'] as const,
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

export function useCurrentStay() {
  return useQuery({ queryKey: contractKeys.current, queryFn: contractsApi.getCurrentStay })
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
  const invalidate = useInvalidate(contractKeys.all, invoiceKeys.all)
  return useMutation({ mutationFn: contractsApi.signContract, onSettled: invalidate })
}

/**
 * Kết thúc hợp đồng kèm lý do — từ chối ký, hủy hợp đồng chờ ký, chấm dứt. Giường
 * trống lại và đơn đăng ký có thể đổi trạng thái, nên làm mới cả đơn và chỗ trống.
 */
export function useEndContract(action: ContractEndAction) {
  const invalidate = useInvalidate(contractKeys.all, registrationKeys.all, roomKeys.all)
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => contractsApi.endContract(id, action, reason),
    onSettled: invalidate,
  })
}

export function useExtendContract() {
  const invalidate = useInvalidate(contractKeys.all, invoiceKeys.all)
  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => contractsApi.extendContract(id, endDate),
    onSettled: invalidate,
  })
}

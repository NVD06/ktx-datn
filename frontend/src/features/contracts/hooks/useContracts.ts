import { useMutation, useQuery } from '@tanstack/react-query'
import * as contractsApi from '@/api/contracts'
import { useInvalidate } from '@/hooks/useInvalidate'

export const contractKeys = {
  all: ['contracts'] as const,
  mine: ['contracts', 'mine'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
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

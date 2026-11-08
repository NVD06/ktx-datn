import { keepPreviousData, skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import * as invoicesApi from '@/api/invoices'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: ListParams) => ['invoices', 'list', params] as const,
  mine: ['invoices', 'mine'] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
  utilitySheet: (buildingId: string, period: string) => ['invoices', 'utility-sheet', buildingId, period] as const,
}

export function useInvoices(params: ListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesApi.listInvoices(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyInvoices() {
  return useQuery({
    queryKey: invoiceKeys.mine,
    queryFn: invoicesApi.listMyInvoices,
  })
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: id ? () => invoicesApi.getInvoice(id) : skipToken,
  })
}

export function useUtilitySheet(buildingId: string | null, period: string) {
  return useQuery({
    queryKey: invoiceKeys.utilitySheet(buildingId ?? '', period),
    queryFn: buildingId ? () => invoicesApi.getUtilitySheet(buildingId, period) : skipToken,
  })
}

/** Chốt xong: bảng chốt, bảng hóa đơn và tổng tiền đều nằm dưới invoiceKeys.all. */
export function useBillUtilities() {
  const invalidate = useInvalidate(invoiceKeys.all)
  return useMutation({ mutationFn: invoicesApi.billUtilities, onSettled: invalidate })
}

/** Hủy lần chốt: hóa đơn bị xóa khỏi mọi bảng, nên làm mới cả invoiceKeys.all như lúc chốt. */
export function useCancelUtility() {
  const invalidate = useInvalidate(invoiceKeys.all)
  return useMutation({ mutationFn: invoicesApi.cancelUtility, onSettled: invalidate })
}

/** Không cần làm mới gì: thành công thì trình duyệt rời hẳn trang sang cổng VNPay. */
export function usePayInvoice() {
  return useMutation({
    mutationFn: invoicesApi.payInvoice,
    onSuccess: ({ payUrl }) => window.location.assign(payUrl),
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

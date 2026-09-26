import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'
import * as invoicesApi from '@/api/invoices'
import type { ListParams } from '@/types/api'

// Ký / gia hạn hợp đồng sinh hóa đơn, nên các mutation đó (useContracts.ts) làm mới cả invoiceKeys.all.
export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: ListParams) => ['invoices', 'list', params] as const,
  summary: (params: ListParams) => ['invoices', 'summary', params] as const,
  mine: ['invoices', 'mine'] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
}

export function useInvoices(params: ListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesApi.listInvoices(params),
    placeholderData: keepPreviousData,
  })
}

/** Tổng tiền theo bộ lọc — bỏ tham số phân trang/sắp xếp để đổi trang không gọi lại. */
export function useInvoiceSummary({ page: _page, sortBy: _sortBy, order: _order, ...filters }: ListParams) {
  return useQuery({
    queryKey: invoiceKeys.summary(filters),
    queryFn: () => invoicesApi.getInvoiceSummary(filters),
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

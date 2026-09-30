import { keepPreviousData, skipToken, useMutation, useQuery } from '@tanstack/react-query'
import * as invoicesApi from '@/api/invoices'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

// Ký / gia hạn hợp đồng sinh hóa đơn, nên các mutation đó (useContracts.ts) làm mới cả invoiceKeys.all.
export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: ListParams) => ['invoices', 'list', params] as const,
  summary: (params: ListParams) => ['invoices', 'summary', params] as const,
  debtByBuilding: ['invoices', 'debt-by-building'] as const,
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

/**
 * Tổng tiền theo bộ lọc — bỏ tham số phân trang/sắp xếp để đổi trang không gọi lại, và bỏ cả
 * `status`: các ô tổng là nút lọc nhanh theo trạng thái, bấm vào ô nào thì số trên các ô vẫn giữ nguyên.
 */
export function useInvoiceSummary({ page: _page, sortBy: _sortBy, order: _order, status: _status, ...filters }: ListParams) {
  return useQuery({
    queryKey: invoiceKeys.summary(filters),
    queryFn: () => invoicesApi.getInvoiceSummary(filters),
    placeholderData: keepPreviousData,
  })
}

export function useDebtByBuilding() {
  return useQuery({
    queryKey: invoiceKeys.debtByBuilding,
    queryFn: invoicesApi.getDebtByBuilding,
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

/** Không cần làm mới gì: thành công thì trình duyệt rời hẳn trang sang cổng VNPay. */
export function usePayInvoice() {
  return useMutation({ mutationFn: invoicesApi.payInvoice })
}

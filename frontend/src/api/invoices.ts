import { apiGet, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { Invoice, InvoiceDetail, InvoiceSummary } from '@/types/invoice'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa. `status=OVERDUE` lọc hóa đơn quá hạn. */
export function listInvoices(params: ListParams) {
  return getPaged<Invoice>('/invoices', params)
}

/** Tổng tiền theo cùng bộ lọc với bảng (bỏ qua phân trang). */
export function getInvoiceSummary(params: ListParams) {
  return apiGet<InvoiceSummary>('/invoices/summary', params)
}

/** Hóa đơn của sinh viên đang đăng nhập — chưa thanh toán lên đầu. */
export function listMyInvoices() {
  return apiGet<Invoice[]>('/invoices/me')
}

export function getInvoice(id: string) {
  return apiGet<InvoiceDetail>(`/invoices/${id}`)
}

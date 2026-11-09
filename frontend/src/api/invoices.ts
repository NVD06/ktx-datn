import { apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type {
  BillUtilitiesInput,
  BillUtilitiesResult,
  CancelUtilityInput,
  CancelUtilityResult,
  Invoice,
  InvoiceDetail,
  RemindInvoicesResult,
  UtilitySheet,
} from '@/types/invoice'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa. `status=OVERDUE` lọc hóa đơn quá hạn. */
export function listInvoices(params: ListParams) {
  return getPaged<Invoice>('/invoices', params)
}

/** Hóa đơn của sinh viên đang đăng nhập — chưa thanh toán lên đầu. */
export function listMyInvoices() {
  return apiGet<Invoice[]>('/invoices/me')
}

/** Bảng chốt chỉ số điện nước — ADMIN/MANAGER, backend chặn tòa ngoài phạm vi. */
export function getUtilitySheet(buildingId: string, period: string) {
  return apiGet<UtilitySheet>('/invoices/utility-sheet', { buildingId, period })
}

export function billUtilities(input: BillUtilitiesInput) {
  return apiPost<BillUtilitiesResult>('/invoices/utility', input)
}

/** Hủy lần chốt của một phòng khi nhập sai — backend chặn nếu đã có SV thanh toán. */
export function cancelUtility(input: CancelUtilityInput) {
  return apiPost<CancelUtilityResult>('/invoices/utility/cancel', input)
}

/** Không truyền `invoiceIds` thì nhắc mọi hóa đơn chưa thanh toán trong phạm vi. */
export function remindInvoices(invoiceIds?: string[]) {
  return apiPost<RemindInvoicesResult>('/invoices/reminders', { invoiceIds })
}

/** SV tạo giao dịch VNPay — trả URL cổng thanh toán để chuyển trình duyệt sang. */
export function payInvoice(id: string) {
  return apiPost<{ payUrl: string }>(`/invoices/${id}/pay`)
}

export function getInvoice(id: string) {
  return apiGet<InvoiceDetail>(`/invoices/${id}`)
}

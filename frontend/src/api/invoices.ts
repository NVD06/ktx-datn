import { apiGet, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type {
  BillUtilitiesInput,
  BillUtilitiesResult,
  BuildingDebt,
  CancelUtilityInput,
  CancelUtilityResult,
  Invoice,
  InvoiceDetail,
  InvoiceSummary,
  UtilitySheet,
} from '@/types/invoice'

/** ADMIN/MANAGER — backend tự giới hạn theo tòa. `status=OVERDUE` lọc hóa đơn quá hạn. */
export function listInvoices(params: ListParams) {
  return getPaged<Invoice>('/invoices', params)
}

/** Tổng tiền theo cùng bộ lọc với bảng (bỏ qua phân trang). */
export function getInvoiceSummary(params: ListParams) {
  return apiGet<InvoiceSummary>('/invoices/summary', params)
}

/** Công nợ từng tòa — MANAGER chỉ nhận tòa mình. */
export function getDebtByBuilding() {
  return apiGet<BuildingDebt[]>('/invoices/debt-by-building')
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

/** SV tạo giao dịch VNPay — trả URL cổng thanh toán để chuyển trình duyệt sang. */
export function payInvoice(id: string) {
  return apiPost<{ payUrl: string }>(`/invoices/${id}/pay`)
}

export function getInvoice(id: string) {
  return apiGet<InvoiceDetail>(`/invoices/${id}`)
}

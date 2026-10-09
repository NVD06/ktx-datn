/**
 * Thống kê & báo cáo (US-06).
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { MoneyTotal } from './invoice'
import type { RequestStatus } from './maintenance'

/** Doanh thu một tháng ("2026-09"): tiền thật đã thu qua VNPay, theo tháng thanh toán. */
export interface RevenueMonth {
  month: string
  roomFee: string
  utility: string
}

export interface OverviewReport {
  /** Giường của phòng đang hoạt động — tỷ lệ lấp đầy = occupied / total. */
  beds: { total: number; occupied: number }
  /** SV đang ở: hợp đồng ACTIVE đã tới ngày vào ở. */
  residents: number
  expiringContracts: { count: number; withinDays: number }
  invoices: { unpaid: MoneyTotal; overdue: MoneyTotal }
  /** `open` = chờ tiếp nhận + đã tiếp nhận. */
  requests: { open: number; byStatus: Record<RequestStatus, number> }
  /** 6 tháng gần nhất, cũ trước mới sau. */
  revenue: RevenueMonth[]
}

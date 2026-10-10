/**
 * Thống kê & báo cáo (US-06).
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { BuildingRef, RoomStatus } from './facility'
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

/** Số giường theo trạng thái — cùng quy tắc với trang phòng (giữ chỗ = hợp đồng chờ ký). */
export interface BedCounts {
  bedCount: number
  occupiedBeds: number
  heldBeds: number
  /** Trống thật sự, không tính giường đang giữ chỗ. */
  availableBeds: number
  maintenanceBeds: number
}

export interface OccupancyRoom extends BedCounts {
  id: string
  code: string
  floor: number
  roomType: { name: string; capacity: number }
  status: RoomStatus
}

export interface OccupancyFloor extends BedCounts {
  floor: number
  rooms: OccupancyRoom[]
}

/** GET /reports/occupancy — một mục mỗi tòa, chỉ tính phòng đang hoạt động. */
export interface OccupancyBuilding extends BedCounts {
  building: BuildingRef & { isActive: boolean }
  floors: OccupancyFloor[]
}

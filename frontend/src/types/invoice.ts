/**
 * Hóa đơn và thanh toán.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { Contract } from './contract'
import type { BuildingRef } from './facility'

/** Quá hạn không phải giá trị trong DB — tính khi đọc bằng invoiceStatus() ở lib/labels.ts. */
export type InvoiceStatus = 'UNPAID' | 'PAID'
export type InvoiceType = 'ROOM_FEE' | 'UTILITY'
export type InvoiceItemType = 'ROOM_FEE' | 'ELECTRIC' | 'WATER'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

/** Phần chung của hóa đơn — dạng rút gọn đi kèm hợp đồng (Contract.invoices). */
export interface InvoiceRef {
  id: string
  /** INV-2026-0001 */
  code: string
  type: InvoiceType
  /** "2026-HK1" tiền phòng · "2026-HK1-GH-20270228" gia hạn · "2026-09" điện nước */
  period: string
  amount: string
  dueDate: string
  status: InvoiceStatus
}

/** Dòng hóa đơn trong bảng — GET /invoices, GET /invoices/me. */
export interface Invoice extends InvoiceRef {
  contractId: string
  /** Số SV chia hóa đơn điện nước lúc chốt. */
  splitCount: number | null
  contract: Pick<Contract, 'id' | 'code' | 'bed' | 'student'>
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id: string
  type: InvoiceItemType
  /** Chỉ số cũ / mới — chỉ điện, nước. */
  oldIndex: number | null
  newIndex: number | null
  /** kWh / m³ của cả phòng, số ngày (gia hạn), 1 (tiền phòng cả kỳ). */
  quantity: string
  unitPrice: string
  /** Phần của sinh viên này. */
  amount: string
}

export interface InvoicePayment {
  id: string
  amount: string
  status: PaymentStatus
  vnpTransactionNo: string | null
  paidAt: string | null
  createdAt: string
}

/** GET /invoices/:id */
export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[]
  payments: InvoicePayment[]
}

export interface MoneyTotal {
  count: number
  amount: string
}

/** GET /invoices/summary — cùng bộ lọc với bảng. */
export type InvoiceSummary = Record<'all' | 'unpaid' | 'overdue', MoneyTotal>

/** GET /invoices/debt-by-building — một dòng mỗi tòa trong phạm vi, sắp theo tên. */
export interface BuildingDebt {
  building: BuildingRef
  unpaid: MoneyTotal
  overdue: MoneyTotal
}

/** Chỉ số điện, nước của cả phòng trong một kỳ. */
export interface MeterReading {
  electricOld: number
  electricNew: number
  waterOld: number
  waterNew: number
}

/** GET /invoices/utility-sheet — bảng chốt điện nước của một tòa trong một tháng. */
export interface UtilitySheet {
  building: { id: string; name: string }
  /** "2026-09" */
  period: string
  /** Đơn giá hiện hành — đ/kWh, đ/m³. */
  prices: { electric: number; water: number }
  rooms: {
    id: string
    code: string
    floor: number
    /** Số SV chia tiền; 0 = phòng trống, không lập hóa đơn. */
    residents: number
    /** Kỳ này đã lập hóa đơn. */
    billed: boolean
    /** Chỉ số mới của lần chốt trước — điền sẵn làm chỉ số cũ. */
    prefill: Partial<MeterReading> | null
  }[]
}

export interface BillUtilitiesInput {
  buildingId: string
  period: string
  readings: (MeterReading & { roomId: string })[]
}

/** BILLED: kỳ này đã chốt · EMPTY: không còn SV ở · NO_USAGE: không dùng gì. */
export interface BillUtilitiesResult {
  invoiceCount: number
  roomCount: number
  skipped: { code: string; reason: 'BILLED' | 'EMPTY' | 'NO_USAGE' }[]
}

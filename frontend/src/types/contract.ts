/**
 * Hợp đồng ở KTX.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { BuildingRef, Gender, RoomTypeRef } from './facility'

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

/** Hợp đồng DRAFT vừa sinh khi duyệt đơn (POST /registrations/:id/approve). */
export interface ApprovedContract {
  id: string
  /** HD-2026-0001 */
  code: string
  registrationId: string
  status: ContractStatus
  startDate: string
  endDate: string
  /** Snapshot giá loại phòng lúc duyệt. */
  price: string
  bed: {
    id: string
    code: string
    room: { id: string; code: string; floor: number; building: { id: string; name: string } }
  }
}

export type InvoiceStatus = 'UNPAID' | 'PAID'
export type InvoiceType = 'ROOM_FEE' | 'UTILITY'

/** Hóa đơn rút gọn đi kèm hợp đồng — hóa đơn tiền phòng sinh ra khi ký. */
export interface ContractInvoice {
  id: string
  /** INV-2026-0001 */
  code: string
  type: InvoiceType
  /** "2026-HK1" (tiền phòng) | "2026-09" (điện nước) */
  period: string
  amount: string
  dueDate: string
  status: InvoiceStatus
}

/** Hợp đồng đầy đủ (GET /contracts/me, GET /contracts/:id, POST /contracts/:id/sign). */
export interface Contract {
  id: string
  code: string
  registrationId: string
  bedId: string
  /** EXPIRED do backend tính khi đọc: DRAFT/ACTIVE đã qua ngày kết thúc. */
  status: ContractStatus
  startDate: string
  endDate: string
  price: string
  signedAt: string | null
  terminatedAt: string | null
  terminationReason: string | null
  period: { id: string; name: string; term: string }
  student: {
    id: string
    fullName: string
    email: string
    phone: string | null
    profile: {
      studentCode: string
      gender: Gender
      className: string | null
      faculty: string | null
    } | null
  }
  bed: {
    id: string
    code: string
    room: { id: string; code: string; floor: number; building: BuildingRef; roomType: RoomTypeRef }
  }
  invoices: ContractInvoice[]
  createdAt: string
  updatedAt: string
}

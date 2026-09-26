/**
 * Hợp đồng ở KTX.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { Role } from './auth'
import type { RoomRef } from './facility'
import type { InvoiceRef } from './invoice'
import type { StudentProfile } from './profile'
import type { RegistrationPeriod } from './registration'

/** TERMINATED: hợp đồng đang ở bị kết thúc sớm · CANCELLED: hợp đồng chờ ký bị hủy, chưa từng có hiệu lực. */
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED'

/** Hợp đồng đầy đủ — mọi API hợp đồng, và cả API duyệt đơn, đều trả về dạng này. */
export interface Contract {
  id: string
  /** HD-2026-0001 */
  code: string
  registrationId: string
  bedId: string
  /** EXPIRED do backend tính khi đọc: DRAFT/ACTIVE đã qua ngày kết thúc. */
  status: ContractStatus
  startDate: string
  endDate: string
  /** Snapshot giá loại phòng lúc duyệt. */
  price: string
  signedAt: string | null
  /** Lúc chấm dứt / hủy và lý do. */
  terminatedAt: string | null
  terminationReason: string | null
  endedById: string | null
  /** Người chấm dứt / hủy — SV tự từ chối ký hay Manager hủy. */
  endedBy: { id: string; fullName: string; role: Role } | null
  /** Thời gian ở của đợt dùng để tính đơn giá ngày khi gia hạn. */
  period: Pick<RegistrationPeriod, 'id' | 'name' | 'term' | 'stayStartAt' | 'stayEndAt'>
  student: {
    id: string
    fullName: string
    email: string
    phone: string | null
    profile: Pick<StudentProfile, 'studentCode' | 'gender' | 'className' | 'faculty'> | null
  }
  bed: { id: string; code: string; room: RoomRef }
  invoices: InvoiceRef[]
  createdAt: string
  updatedAt: string
}

/** Chỗ ở hiện tại của sinh viên (GET /contracts/me/current); null = chưa có chỗ ở. */
export interface CurrentStay {
  contract: Contract
  /** Chỉ tên, lớp, giường — không có thông tin liên lạc. */
  roommates: { fullName: string; className: string | null; bedCode: string }[]
}

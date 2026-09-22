/**
 * Đăng ký ở KTX: đợt đăng ký, đơn đăng ký.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { BuildingRef, RoomTypeRef } from './facility'

export interface RegistrationPeriod {
  id: string
  name: string
  /** Thời gian nhận đơn — chỉ để thông báo, mở/đóng thật do `isOpen`. */
  startAt: string
  endAt: string
  /** Tối đa 1 đợt mở tại một thời điểm. */
  isOpen: boolean
  /** Thời gian ở — kỳ hạn hợp đồng sinh ra từ đợt. */
  stayStartAt: string
  stayEndAt: string
  registrationCount: number
  createdAt: string
  updatedAt: string
}

/** Không có `isOpen` — mở/đóng đi qua endpoint riêng. */
export interface RegistrationPeriodInput {
  name: string
  startAt: string
  endAt: string
  stayStartAt: string
  stayEndAt: string
}

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Registration {
  id: string
  periodId: string
  studentId: string
  period: Pick<
    RegistrationPeriod,
    'id' | 'name' | 'isOpen' | 'startAt' | 'endAt' | 'stayStartAt' | 'stayEndAt'
  >
  /** Nguyện vọng tòa, null = tòa nào cũng được. */
  building: BuildingRef | null
  preferredRoomTypeId: string | null
  preferredRoomType: RoomTypeRef | null
  note: string | null
  status: RegistrationStatus
  reviewedById: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

export interface RegistrationInput {
  buildingId: string | null
  preferredRoomTypeId: string | null
  note: string | null
}

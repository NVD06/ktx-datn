/**
 * Đăng ký ở KTX: đợt đăng ký, đơn đăng ký.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

export interface RegistrationPeriod {
  id: string
  name: string
  startAt: string
  endAt: string
  /** Tối đa 1 đợt mở tại một thời điểm. */
  isOpen: boolean
  registrationCount: number
  createdAt: string
  updatedAt: string
}

/** Không có `isOpen` — mở/đóng đi qua endpoint riêng. */
export interface RegistrationPeriodInput {
  name: string
  startAt: string
  endAt: string
}

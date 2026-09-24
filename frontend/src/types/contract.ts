/**
 * Hợp đồng ở KTX.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

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

/**
 * Yêu cầu sửa chữa (US-05).
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { RoomRef } from './facility'
import type { StudentProfile } from './profile'

/** Chỉ tiến từng bước: PENDING → RECEIVED → DONE → CONFIRMED (SV xác nhận), hoặc PENDING → REJECTED. */
export type RequestStatus = 'PENDING' | 'RECEIVED' | 'DONE' | 'CONFIRMED' | 'REJECTED'

export interface MaintenanceRequest {
  id: string
  roomId: string
  studentId: string
  title: string
  description: string
  status: RequestStatus
  /** Phản hồi của ban quản lý; lý do khi từ chối. */
  assigneeNote: string | null
  handledById: string | null
  /** Người chuyển trạng thái gần nhất. */
  handledBy: { id: string; fullName: string } | null
  receivedAt: string | null
  doneAt: string | null
  confirmedAt: string | null
  rejectedAt: string | null
  room: RoomRef
  student: {
    id: string
    fullName: string
    email: string
    phone: string | null
    profile: Pick<StudentProfile, 'studentCode' | 'className'> | null
  }
  createdAt: string
  updatedAt: string
}

export interface MaintenanceInput {
  title: string
  description: string
}

export interface UpdateMaintenanceStatusInput {
  /** Bước ban quản lý chuyển tới — CONFIRMED do sinh viên tự bấm. */
  status: 'RECEIVED' | 'DONE' | 'REJECTED'
  /** Lý do — bắt buộc khi từ chối. */
  assigneeNote?: string
}

export interface MaintenanceStats {
  month: string
  pending: number
  received: number
  done: number
  createdThisMonth: number
  finishedThisMonth: number
  groupBy: 'BUILDING' | 'FLOOR'
  groups: { label: string; count: number }[]
  avgHours: number | null
}

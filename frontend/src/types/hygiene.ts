/**
 * Điểm vệ sinh (US-05.4, US-05.5).
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

import type { RoomRef } from './facility'

export type HygieneViolation = 'TRASH' | 'MESSY' | 'DIRTY_WC' | 'CORRIDOR' | 'COOKING' | 'ABSENT'

interface HygieneScore {
  /** Điểm còn lại sau đợt, trừ dồn trong kỳ nửa tháng — dưới HYGIENE_WARNING_SCORE là cảnh báo. */
  score: number
  /** Điểm bị trừ trong đợt này = tổng điểm các lỗi. */
  deduction: number
  note: string | null
  violations: HygieneViolation[]
}

/** Số dấu vệ sinh của SV trong hợp đồng gần nhất (GET /hygiene-records/me/marks). */
export interface HygieneMarks {
  marks: number
}

export interface HygieneRecord extends HygieneScore {
  id: string
  roomId: string
  /** 00:00 giờ Việt Nam của ngày kiểm tra. */
  checkDate: string
  checkedById: string
  checkedBy: { id: string; fullName: string }
  room: RoomRef
  createdAt: string
  updatedAt: string
}

/** Bảng chấm của một tòa trong một ngày (GET /hygiene-records/sheet). */
export interface HygieneSheet {
  building: { id: string; name: string }
  checkDate: string
  rooms: {
    id: string
    code: string
    floor: number
    /** Số SV ở ngày kiểm tra. */
    residents: number
    scoreBefore: number
    /** Điểm đã chấm ngày này — null: chưa chấm. */
    record: (HygieneScore & { id: string }) | null
  }[]
}

export interface SaveHygieneInput {
  buildingId: string
  /** "2026-10-07" — ngày ở Việt Nam, không sau hôm nay. */
  checkDate: string
  records: { roomId: string; violations: HygieneViolation[] }[]
}

export interface SaveHygieneResult {
  roomCount: number
  /** Số phòng dưới ngưỡng cảnh báo. */
  warningCount: number
}

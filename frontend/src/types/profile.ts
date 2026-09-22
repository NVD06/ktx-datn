/**
 * Hồ sơ sinh viên đang đăng nhập — chép từ backend/src/docs/schemas.ts (StudentProfile).
 */

import type { Gender } from './facility'

export type ProfileField = 'phone' | 'dob' | 'className' | 'faculty' | 'hometown' | 'citizenId'

export interface StudentProfile {
  /** id của User. */
  id: string
  email: string
  fullName: string
  phone: string | null
  studentCode: string
  gender: Gender
  dob: string | null
  className: string | null
  faculty: string | null
  hometown: string | null
  citizenId: string | null
  /** Đủ thông tin để nộp đơn đăng ký. */
  isComplete: boolean
  missingFields: ProfileField[]
}

/** `null` = xóa giá trị. Không sửa được mã sinh viên và giới tính. */
export type ProfileInput = Partial<Record<ProfileField, string | null>>

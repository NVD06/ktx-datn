import type { Role } from './auth'
import type { Gender } from './facility'

/** Kết quả của GET /api/v1/users — không bao giờ có passwordHash. */
export interface UserSummary {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: Role
  isActive: boolean
  /** Chưa đổi mật khẩu ban đầu do Admin cấp. */
  mustChangePassword: boolean
  buildingId: string | null
  building: { id: string; name: string } | null
  /** Chỉ sinh viên. */
  profile: { studentCode: string } | null
  createdAt: string
  updatedAt: string
}

/** POST /users — không có `role`: backend luôn tạo MANAGER. */
export interface CreateManagerInput {
  email: string
  fullName: string
  phone?: string
  password: string
  /** Bỏ trống = chưa gán tòa. */
  buildingId?: string | null
}

/**
 * POST /users/students và từng dòng của /users/students/import. Không có mật khẩu:
 * backend đặt mật khẩu ban đầu là mã SV, sinh viên phải đổi ở lần đăng nhập đầu.
 */
export interface StudentAccountInput {
  studentCode: string
  fullName: string
  email: string
  gender: Gender
  phone?: string
  className?: string
  faculty?: string
}

/** `dryRun = true`: `created` là số tài khoản sẽ tạo. `skipped`: dòng đã có đúng tài khoản đó. */
export interface ImportStudentsResult {
  dryRun: boolean
  created: number
  skipped: number
}

export interface UserUpdateInput {
  buildingId?: string | null
  isActive?: boolean
}

export type Role = 'ADMIN' | 'MANAGER' | 'STUDENT'

/** Kết quả của GET /api/v1/auth/me — chép từ backend/src/types/auth-user.ts. */
export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: Role
  /** Chỉ MANAGER mới có giá trị. */
  buildingId: string | null
  /** Đang dùng mật khẩu ban đầu do Admin cấp — phải đổi mới dùng được hệ thống. */
  mustChangePassword: boolean
}

/** POST /api/v1/auth/change-password */
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

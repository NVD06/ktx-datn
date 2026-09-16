export type Role = 'ADMIN' | 'MANAGER' | 'STUDENT'

/** Kết quả của GET /api/v1/auth/me — chép từ backend/src/types/auth-user.ts. */
export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: Role
  /** Chỉ MANAGER mới có giá trị. */
  buildingId: string | null
}

/**
 * Kết quả của POST /api/v1/auth/register — chép từ `registeredUserSchema`
 * ở backend/src/docs/schemas.ts.
 *
 * Hẹp hơn `AuthUser`: endpoint này chỉ tạo tài khoản chứ không đăng nhập, nên
 * không trả `buildingId`. Khai là `AuthUser` thì TypeScript cho đọc
 * `user.buildingId` mà không cảnh báo, trong khi lúc chạy luôn là `undefined`.
 */
export interface RegisteredUser {
  id: string
  email: string
  fullName: string
  role: Role
}

export interface RegisterInput {
  email: string
  password: string
  fullName: string
  phone?: string
  studentCode: string
  gender: 'MALE' | 'FEMALE'
  className?: string
  faculty?: string
}

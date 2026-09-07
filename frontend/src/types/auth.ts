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

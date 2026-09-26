import type { Role } from './auth'

/** Kết quả của GET /api/v1/users — không bao giờ có passwordHash. */
export interface UserSummary {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: Role
  isActive: boolean
  buildingId: string | null
  building: { id: string; name: string } | null
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

export interface UserUpdateInput {
  buildingId?: string | null
  isActive?: boolean
}

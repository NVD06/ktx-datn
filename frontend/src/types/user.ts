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

/**
 * Cơ sở vật chất: tòa nhà, loại phòng, phòng, giường.
 * Chép từ response của backend (backend/src/docs/schemas.ts) — sửa bên đó thì sửa cả ở đây.
 */

export type Gender = 'MALE' | 'FEMALE'
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

/** Tính từ trạng thái giường ở backend, không lưu DB. */
export type RoomStatus = 'AVAILABLE' | 'FULL' | 'MAINTENANCE'

export interface Building {
  id: string
  name: string
  floors: number
  /** null = tòa hỗn hợp */
  gender: Gender | null
  description: string | null
  isActive: boolean
  /** Mỗi tòa tối đa 1 quản lý, null = chưa gán. */
  manager: { id: string; fullName: string; email: string } | null
  roomCount: number
  createdAt: string
  updatedAt: string
}

export interface BuildingInput {
  name: string
  floors: number
  gender: Gender | null
  description: string | null
  isActive: boolean
}

export interface RoomType {
  id: string
  name: string
  capacity: number
  /** Decimal trả về dạng chuỗi, ví dụ "1500000". */
  price: string
  description: string | null
  isActive: boolean
  roomCount: number
  createdAt: string
  updatedAt: string
}

export interface RoomTypeInput {
  name: string
  capacity: number
  price: number
  description: string | null
  isActive: boolean
}

/** Tòa rút gọn đi kèm dữ liệu khác (chỗ trống, đơn đăng ký). */
export interface BuildingRef {
  id: string
  name: string
  gender: Gender | null
}

export interface RoomTypeRef {
  id: string
  name: string
  capacity: number
  price: string
}

export interface Bed {
  id: string
  roomId: string
  code: string
  status: BedStatus
  createdAt: string
  updatedAt: string
}

export interface Room {
  id: string
  buildingId: string
  roomTypeId: string
  code: string
  floor: number
  isActive: boolean
  building: { id: string; name: string }
  roomType: RoomTypeRef
  bedCount: number
  availableBeds: number
  occupiedBeds: number
  maintenanceBeds: number
  status: RoomStatus
  createdAt: string
  updatedAt: string
}

export interface RoomDetail extends Omit<Room, 'building'> {
  building: { id: string; name: string; floors: number }
  beds: Bed[]
}

export interface RoomInput {
  buildingId: string
  roomTypeId: string
  code: string
  floor: number
  isActive: boolean
}

export type RoomUpdateInput = Omit<RoomInput, 'buildingId'>

export interface BedUpdateInput {
  code?: string
  status?: 'AVAILABLE' | 'MAINTENANCE'
}

/** Chỗ trống gom theo tòa × loại phòng — trang "Chỗ trống" và form nộp đơn của sinh viên. */
export interface AvailableSummary {
  building: BuildingRef
  roomType: RoomTypeRef
  /** Số phòng còn chỗ. */
  roomCount: number
  /** Tổng số giường còn trống. */
  availableBeds: number
}

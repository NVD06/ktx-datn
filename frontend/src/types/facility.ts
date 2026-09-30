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
  /** Tòa nam hoặc tòa nữ — không có tòa hỗn hợp. */
  gender: Gender
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
  gender: Gender
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
  gender: Gender
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
  /** Giường trống thật sự — không tính giường đang giữ chỗ. */
  availableBeds: number
  /** Giường còn trống nhưng đã có hợp đồng chờ ký giữ chỗ. */
  heldBeds: number
  occupiedBeds: number
  maintenanceBeds: number
  status: RoomStatus
  createdAt: string
  updatedAt: string
}

export interface RoomDetail extends Omit<Room, 'building'> {
  building: { id: string; name: string; floors: number }
  /** `held`: đang giữ chỗ cho hợp đồng chờ ký. */
  beds: (Bed & { held: boolean })[]
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

/** Phòng rút gọn đi kèm dữ liệu khác (giường trống khi duyệt, hợp đồng). */
export interface RoomRef {
  id: string
  code: string
  floor: number
  building: BuildingRef
  roomType: RoomTypeRef
}

/** Phòng còn giường xếp được cho một sinh viên — dialog duyệt đơn (GET /beds/available). */
export interface AvailableRoom extends RoomRef {
  /** Chỉ giường còn xếp được, sắp theo mã. */
  beds: { id: string; code: string }[]
}

export interface AvailableBedParams {
  /** Giới tính SV cần xếp — backend chỉ trả phòng SV đó được ở. */
  gender: Gender
  buildingId?: string
}

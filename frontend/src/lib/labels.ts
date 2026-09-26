/**
 * Nhãn tiếng Việt cho mọi enum của backend.
 *
 * Gom về một chỗ vì các giá trị này xuất hiện ở rất nhiều màn hình — để rải rác
 * thì cùng một trạng thái sẽ được dịch mỗi nơi một kiểu.
 *
 * `tone` quyết định màu badge, xem components/shared/StatusBadge.tsx.
 */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Lớp màu của từng tone — định nghĩa ở styles/theme.css (`@utility tone-*`).
 * Viết đủ tên lớp, không ghép chuỗi, để Tailwind quét thấy mà sinh CSS.
 */
export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'tone-neutral',
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  info: 'tone-info',
}

interface LabelDef {
  label: string
  tone: Tone
}

function def<T extends string>(map: Record<T, LabelDef>) {
  return map
}

export const ROLE = def({
  ADMIN: { label: 'Quản trị viên', tone: 'info' },
  MANAGER: { label: 'Quản lý tòa', tone: 'info' },
  STUDENT: { label: 'Sinh viên', tone: 'neutral' },
})

export const GENDER = def({
  MALE: { label: 'Nam', tone: 'neutral' },
  FEMALE: { label: 'Nữ', tone: 'neutral' },
})

export const BED_STATUS = def({
  AVAILABLE: { label: 'Còn trống', tone: 'success' },
  OCCUPIED: { label: 'Đang ở', tone: 'info' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'warning' },
})

/** Tòa không đặt giới tính (`gender = null`). */
export const MIXED_GENDER: LabelDef = { label: 'Hỗn hợp', tone: 'neutral' }

/** Nhãn giới tính của tòa: Nam / Nữ / Hỗn hợp. */
export function buildingGender(gender: keyof typeof GENDER | null): LabelDef {
  return gender ? GENDER[gender] : MIXED_GENDER
}

/**
 * Trạng thái phòng — backend tính từ giường, không lưu DB.
 * FULL dùng `info` như "Đang ở": phòng đầy là đang được dùng bình thường.
 */
export const ROOM_STATUS = def({
  AVAILABLE: { label: 'Còn chỗ', tone: 'success' },
  FULL: { label: 'Đã đầy', tone: 'info' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'warning' },
})

/** Cờ `isActive` của tòa nhà, loại phòng, phòng. */
export const ACTIVE_STATUS = def({
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
})

export function activeStatus(isActive: boolean): LabelDef {
  return ACTIVE_STATUS[isActive ? 'ACTIVE' : 'INACTIVE']
}

/** Bộ lọc `?isActive=` của tòa nhà và phòng. */
export const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

/** Cờ `isActive` của tài khoản — khóa thì không đăng nhập được, phiên đang mở bị 401. */
export const ACCOUNT_STATUS = def({
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  LOCKED: { label: 'Đã khóa', tone: 'danger' },
})

export function accountStatus(isActive: boolean): LabelDef {
  return ACCOUNT_STATUS[isActive ? 'ACTIVE' : 'LOCKED']
}

/** Bộ lọc `?isActive=` của tài khoản. */
export const ACCOUNT_OPTIONS = [
  { value: 'true', label: ACCOUNT_STATUS.ACTIVE.label },
  { value: 'false', label: ACCOUNT_STATUS.LOCKED.label },
]

/** Cờ `isOpen` của đợt đăng ký. */
export const PERIOD_STATUS = def({
  OPEN: { label: 'Đang mở', tone: 'success' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
})

/** Trường hồ sơ sinh viên — dùng cho thông báo "còn thiếu" và nhãn form. */
export const PROFILE_FIELD = {
  phone: 'Số điện thoại',
  dob: 'Ngày sinh',
  className: 'Lớp',
  faculty: 'Khoa',
  hometown: 'Quê quán',
  citizenId: 'Số CCCD',
} as const

/** ['dob', 'citizenId'] -> "Ngày sinh, Số CCCD" */
export function missingFieldLabels(fields: (keyof typeof PROFILE_FIELD)[]): string {
  return fields.map((f) => PROFILE_FIELD[f]).join(', ')
}

export const REGISTRATION_STATUS = def({
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
})

export const CONTRACT_STATUS = def({
  DRAFT: { label: 'Chờ ký', tone: 'warning' },
  ACTIVE: { label: 'Đang hiệu lực', tone: 'success' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
  TERMINATED: { label: 'Đã chấm dứt', tone: 'danger' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
})

export const INVOICE_STATUS = def({
  UNPAID: { label: 'Chưa thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
})

export const INVOICE_TYPE = def({
  ROOM_FEE: { label: 'Tiền phòng', tone: 'neutral' },
  UTILITY: { label: 'Điện nước', tone: 'neutral' },
})

export const INVOICE_ITEM_TYPE = def({
  ROOM_FEE: { label: 'Tiền phòng', tone: 'neutral' },
  ELECTRIC: { label: 'Tiền điện', tone: 'neutral' },
  WATER: { label: 'Tiền nước', tone: 'neutral' },
})

export const PAYMENT_STATUS = def({
  PENDING: { label: 'Đang xử lý', tone: 'warning' },
  SUCCESS: { label: 'Thành công', tone: 'success' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
})

export const REQUEST_STATUS = def({
  PENDING: { label: 'Chờ tiếp nhận', tone: 'warning' },
  RECEIVED: { label: 'Đã tiếp nhận', tone: 'info' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'info' },
  DONE: { label: 'Đã sửa xong', tone: 'success' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
})

/**
 * OVERDUE không phải giá trị trong DB mà tính khi đọc
 * (dueDate < now && status = UNPAID) — xem docs/database.md §3.9.
 */
export const OVERDUE: LabelDef = { label: 'Quá hạn', tone: 'danger' }

/** Hóa đơn chưa thanh toán mà đã qua hạn là "Quá hạn" — tính khi đọc, không lưu DB (us-04.md, US-04.3). */
export function isOverdue(invoice: { status: keyof typeof INVOICE_STATUS; dueDate: string }) {
  return invoice.status === 'UNPAID' && new Date(invoice.dueDate) < new Date()
}

export function invoiceStatus(invoice: { status: keyof typeof INVOICE_STATUS; dueDate: string }): LabelDef {
  return isOverdue(invoice) ? OVERDUE : INVOICE_STATUS[invoice.status]
}

/** Bộ lọc `?status=` của bảng hóa đơn — "Quá hạn" do backend tính theo hạn thanh toán. */
export const INVOICE_FILTER_OPTIONS = toOptions({ UNPAID: INVOICE_STATUS.UNPAID, OVERDUE, PAID: INVOICE_STATUS.PAID })

/** Bảng nhãn → lựa chọn của FilterSelect (lọc theo trạng thái). */
export function toOptions(map: Record<string, LabelDef>) {
  return Object.entries(map).map(([value, { label }]) => ({ value, label }))
}

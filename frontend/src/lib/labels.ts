/**
 * Nhãn tiếng Việt cho mọi enum của backend.
 *
 * Gom về một chỗ vì các giá trị này xuất hiện ở rất nhiều màn hình — để rải rác
 * thì cùng một trạng thái sẽ được dịch mỗi nơi một kiểu.
 *
 * `tone` quyết định màu badge, xem components/shared/StatusBadge.tsx.
 */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

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
})

export const INVOICE_STATUS = def({
  UNPAID: { label: 'Chưa thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
})

export const INVOICE_TYPE = def({
  ROOM_FEE: { label: 'Tiền phòng', tone: 'neutral' },
  UTILITY: { label: 'Điện nước', tone: 'neutral' },
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

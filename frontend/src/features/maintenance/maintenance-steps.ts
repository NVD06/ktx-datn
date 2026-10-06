import type { DetailRow } from '@/components/shared/DetailList'
import { formatDateTime } from '@/lib/format'
import type { MaintenanceRequest, RequestStatus, UpdateMaintenanceStatusInput } from '@/types/maintenance'

/**
 * Bước kế tiếp ban quản lý được bấm, theo trạng thái hiện tại — chỉ tiến từng bước
 * (docs/flows/maintenance-flow.md). Từ chối là nhánh riêng, chỉ khi còn PENDING.
 * Backend vẫn kiểm tra lại: nhảy cóc hoặc người khác vừa xử lý thì trả 409.
 */
export const NEXT_STEP: Partial<Record<RequestStatus, { status: UpdateMaintenanceStatusInput['status']; label: string }>> = {
  PENDING: { status: 'RECEIVED', label: 'Tiếp nhận' },
  RECEIVED: { status: 'DONE', label: 'Báo đã sửa xong' },
}

/** Tiến độ của yêu cầu dạng các dòng DetailList — dùng kèm `hideEmpty` để ẩn bước chưa tới. */
export function progressRows(r: MaintenanceRequest): DetailRow[] {
  const at = (value: string | null) => value && formatDateTime(value)
  return [
    ['Gửi lúc', formatDateTime(r.createdAt)],
    ['Tiếp nhận lúc', at(r.receivedAt)],
    ['Sửa xong lúc', at(r.doneAt)],
    ['Sinh viên xác nhận lúc', at(r.confirmedAt)],
    ['Từ chối lúc', at(r.rejectedAt)],
  ]
}

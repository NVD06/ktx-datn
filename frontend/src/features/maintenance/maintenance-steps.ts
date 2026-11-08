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

const at = (value: string | null) => value && formatDateTime(value)

/** Tiến độ của yêu cầu dạng các dòng DetailList — dùng kèm `hideEmpty` để ẩn bước chưa tới. */
export function progressRows(r: MaintenanceRequest): DetailRow[] {
  return [
    ['Gửi lúc', formatDateTime(r.createdAt)],
    ['Tiếp nhận lúc', at(r.receivedAt)],
    ['Sửa xong lúc', at(r.doneAt)],
    ['Sinh viên xác nhận lúc', at(r.confirmedAt)],
    ['Từ chối lúc', at(r.rejectedAt)],
  ]
}

export function timeline(r: MaintenanceRequest) {
  const by = (value: string | null) => value && `${formatDateTime(value)}${r.handledBy ? ` · ${r.handledBy.fullName}` : ''}`
  const sent = { title: 'Đã gửi', time: at(r.createdAt), note: null }
  if (r.status === 'REJECTED') return [sent, { title: 'Ban quản lý từ chối', time: by(r.rejectedAt), note: r.assigneeNote }]
  return [
    sent,
    { title: 'Ban quản lý tiếp nhận', time: at(r.receivedAt), note: null },
    { title: 'Đã sửa xong', time: by(r.doneAt), note: r.assigneeNote },
    { title: 'Bạn xác nhận', time: at(r.confirmedAt), note: null },
  ]
}

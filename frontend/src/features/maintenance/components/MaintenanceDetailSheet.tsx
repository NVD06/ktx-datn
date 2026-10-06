import { DetailList, DetailSection, type DetailRow } from '@/components/shared/DetailList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { REQUEST_STATUS } from '@/lib/labels'
import type { MaintenanceRequest } from '@/types/maintenance'
import { NEXT_STEP, progressRows } from '../maintenance-steps'

/**
 * Chi tiết yêu cầu cho ban quản lý — dữ liệu lấy sẵn từ dòng của bảng. Chân drawer có nút
 * bước kế tiếp (và từ chối khi còn chờ tiếp nhận) để đọc xong xử lý luôn.
 *
 * `request` tách khỏi `open` để nội dung còn nguyên trong lúc drawer trượt ra.
 */
export function MaintenanceDetailSheet({
  request: r,
  open,
  onOpenChange,
  onStep,
  onReject,
}: {
  request: MaintenanceRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStep: (request: MaintenanceRequest) => void
  onReject: (request: MaintenanceRequest) => void
}) {
  const step = r && NEXT_STEP[r.status]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-md">
        {r && <Content request={r} />}
        {r && step && (
          <SheetFooter className="border-t sm:flex-row sm:justify-end">
            {r.status === 'PENDING' && (
              <Button variant="outline" onClick={() => onReject(r)}>
                Từ chối
              </Button>
            )}
            <Button onClick={() => onStep(r)}>{step.label}</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Content({ request: r }: { request: MaintenanceRequest }) {
  const { student } = r

  const requestRows: DetailRow[] = [
    ['Phòng', `${r.room.code} · tầng ${r.room.floor} · Tòa ${r.room.building.name}`, true],
    ['Mô tả', r.description, true],
    [r.status === 'REJECTED' ? 'Lý do từ chối' : 'Phản hồi của ban quản lý', r.assigneeNote, true],
    ['Người xử lý gần nhất', r.handledBy?.fullName],
  ]

  const studentRows: DetailRow[] = [
    ['Họ tên', student.fullName],
    ['Mã sinh viên', student.profile?.studentCode],
    ['Lớp', student.profile?.className],
    ['Số điện thoại', student.phone],
    ['Email', student.email, true],
  ]

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle>{r.title}</SheetTitle>
        <SheetDescription>
          Phòng {r.room.code} · Tòa {r.room.building.name}
        </SheetDescription>
        <div className="pt-2">
          <StatusBadge {...REQUEST_STATUS[r.status]} />
        </div>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <DetailSection title="Yêu cầu">
          <DetailList rows={requestRows} hideEmpty />
        </DetailSection>
        <DetailSection title="Tiến độ">
          <DetailList rows={progressRows(r)} hideEmpty />
        </DetailSection>
        <DetailSection title="Sinh viên gửi">
          <DetailList rows={studentRows} />
        </DetailSection>
      </div>
    </>
  )
}

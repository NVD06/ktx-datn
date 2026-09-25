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
import { formatDate, formatDateRange, formatDateTime, formatMoney } from '@/lib/format'
import { GENDER, REGISTRATION_STATUS } from '@/lib/labels'
import type { RegistrationListItem } from '@/types/registration'

/**
 * Chi tiết đơn + hồ sơ sinh viên cho người duyệt (US-02.4). Dữ liệu lấy sẵn từ
 * dòng của bảng, không gọi API riêng. Đơn còn chờ duyệt thì có nút duyệt/từ chối
 * ở chân — xem hồ sơ xong quyết định luôn, không phải quay lại bảng.
 *
 * `registration` tách khỏi `open` để nội dung còn nguyên trong lúc drawer trượt ra.
 */
export function RegistrationDetailSheet({
  registration: r,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: {
  registration: RegistrationListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (registration: RegistrationListItem) => void
  onReject: (registration: RegistrationListItem) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-md">
        {r && <Content registration={r} />}
        {r?.status === 'PENDING' && (
          <SheetFooter className="border-t sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onReject(r)}>
              Từ chối
            </Button>
            <Button onClick={() => onApprove(r)}>Duyệt và xếp giường</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Content({ registration: r }: { registration: RegistrationListItem }) {
  const { student } = r
  const profile = student.profile

  const application: DetailRow[] = [
    ['Đợt đăng ký', r.period.name, true],
    ['Thời gian ở', formatDateRange(r.period.stayStartAt, r.period.stayEndAt)],
    ['Nộp lúc', formatDateTime(r.createdAt)],
    ['Nguyện vọng tòa', r.building ? `Tòa ${r.building.name}` : 'Tòa nào cũng được'],
    [
      'Nguyện vọng loại phòng',
      r.preferredRoomType
        ? `${r.preferredRoomType.name} — ${formatMoney(r.preferredRoomType.price)} / kỳ`
        : 'Loại nào cũng được',
    ],
    ['Ghi chú của sinh viên', r.note, true],
    ['Phản hồi của ban quản lý', r.reviewNote, true],
  ]

  const studentRows: DetailRow[] = [
    ['Mã sinh viên', profile?.studentCode],
    ['Giới tính', profile && GENDER[profile.gender].label],
    ['Ngày sinh', profile?.dob && formatDate(profile.dob)],
    ['Số CCCD', profile?.citizenId],
    ['Lớp', profile?.className],
    ['Khoa', profile?.faculty],
    ['Số điện thoại', student.phone],
    ['Email', student.email],
    ['Quê quán', profile?.hometown, true],
  ]

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle>{student.fullName}</SheetTitle>
        <SheetDescription>
          {profile ? `${profile.studentCode} · ` : ''}
          {student.email}
        </SheetDescription>
        <div className="pt-2">
          <StatusBadge {...REGISTRATION_STATUS[r.status]} />
        </div>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <DetailSection title="Đơn đăng ký">
          <DetailList rows={application} hideEmpty />
        </DetailSection>
        <DetailSection title="Hồ sơ sinh viên">
          <DetailList rows={studentRows} />
        </DetailSection>
      </div>
    </>
  )
}

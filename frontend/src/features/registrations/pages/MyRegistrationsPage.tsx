import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DetailList, type DetailRow } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateRange, formatDateTime, formatMoney } from '@/lib/format'
import { REGISTRATION_STATUS } from '@/lib/labels'
import type { Registration } from '@/types/registration'
import { useCancelRegistration, useMyRegistrations } from '../hooks/useRegistrations'

/**
 * Đơn đăng ký của sinh viên (US-02.3): theo dõi trạng thái và hủy khi còn chờ
 * duyệt. Nộp đơn làm ở trang "Chỗ trống" — bấm "Đăng ký" ở tòa × loại phòng muốn ở.
 */
export function MyRegistrationsPage() {
  const registrations = useMyRegistrations()
  const cancel = useCancelRegistration()
  const [cancelling, setCancelling] = useState<Registration | null>(null)

  return (
    <>
      <PageHeader title="Đơn đăng ký của tôi" description="Theo dõi kết quả xét duyệt đơn đăng ký ở KTX." />

      {registrations.isPending && <LoadingState />}
      {registrations.isError && <ErrorState error={registrations.error} />}
      {registrations.data?.length === 0 && (
        <EmptyState
          title="Bạn chưa nộp đơn nào"
          description="Chọn tòa và loại phòng muốn ở ở trang Chỗ trống để nộp đơn."
          action={
            <Button asChild variant="outline">
              <Link to="/student/rooms">Xem chỗ trống</Link>
            </Button>
          }
        />
      )}

      {registrations.data && registrations.data.length > 0 && (
        <div className="space-y-3">
          {registrations.data.map((r) => (
            <RegistrationCard key={r.id} registration={r} onCancel={() => setCancelling(r)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        target={cancelling}
        onClose={() => setCancelling(null)}
        title="Hủy đơn đăng ký?"
        description={(r) => (
          <>
            Hủy đơn đợt <strong>{r.period.name}</strong>. Sau khi hủy, bạn có thể nộp lại đơn mới nếu đợt
            vẫn còn mở.
          </>
        )}
        confirmLabel="Hủy đơn"
        isPending={cancel.isPending}
        onConfirm={(r) => cancel.mutateAsync(r.id).then(() => toast.success(`Đã hủy đơn đợt "${r.period.name}"`))}
      />
    </>
  )
}

function RegistrationCard({
  registration: r,
  onCancel,
}: {
  registration: Registration
  onCancel: () => void
}) {
  const rows: DetailRow[] = [
    ['Nguyện vọng tòa', r.building ? `Tòa ${r.building.name}` : 'Tòa nào cũng được'],
    [
      'Nguyện vọng loại phòng',
      r.preferredRoomType
        ? `${r.preferredRoomType.name} — ${formatMoney(r.preferredRoomType.price)} / kỳ`
        : 'Loại nào cũng được',
    ],
    ['Ghi chú', r.note, true],
    ['Phản hồi của ban quản lý', r.reviewNote, true],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{r.period.name}</CardTitle>
        <CardDescription>
          Ở {formatDateRange(r.period.stayStartAt, r.period.stayEndAt)} · Nộp lúc{' '}
          {formatDateTime(r.createdAt)}
        </CardDescription>
        <CardAction>
          <StatusBadge {...REGISTRATION_STATUS[r.status]} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailList rows={rows} hideEmpty />

        {r.status === 'PENDING' && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Hủy đơn
            </Button>
          </div>
        )}

        {r.status === 'APPROVED' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Ban quản lý đã xếp giường cho bạn — ký hợp đồng để nhận chỗ ở.
            </p>
            <Button asChild size="sm">
              <Link to="/student/contracts">Xem hợp đồng</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

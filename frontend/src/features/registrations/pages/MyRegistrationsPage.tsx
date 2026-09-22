import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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

  function confirmCancel() {
    if (!cancelling) return
    cancel.mutate(cancelling.id, {
      onSuccess: () => toast.success(`Đã hủy đơn đợt "${cancelling.period.name}"`),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setCancelling(null),
    })
  }

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
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Hủy đơn đăng ký?"
        description={
          <>
            Hủy đơn đợt <strong>{cancelling?.period.name}</strong>. Sau khi hủy, bạn có thể nộp lại đơn
            mới nếu đợt vẫn còn mở.
          </>
        }
        confirmLabel="Hủy đơn"
        isPending={cancel.isPending}
        onConfirm={confirmCancel}
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
  const status = REGISTRATION_STATUS[r.status]
  const rows: [label: string, value: string | null, wide?: boolean][] = [
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
          <StatusBadge label={status.label} tone={status.tone} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map(
            ([label, value, wide]) =>
              value && (
                <div key={label} className={wide ? 'sm:col-span-2' : undefined}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="whitespace-pre-line">{value}</dd>
                </div>
              ),
          )}
        </dl>

        {r.status === 'PENDING' && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Hủy đơn
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

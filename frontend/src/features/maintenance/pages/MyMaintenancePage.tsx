import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { SelectableRow } from '@/components/shared/SelectableRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentStay } from '@/features/contracts/hooks/useContracts'
import { formatDate } from '@/lib/format'
import { REQUEST_STATUS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest } from '@/types/maintenance'
import { MaintenanceForm } from '../components/MaintenanceForm'
import { useConfirmMaintenanceRequest, useMyMaintenanceRequests } from '../hooks/useMaintenance'
import { timeline } from '../maintenance-steps'

/**
 * Yêu cầu sửa chữa của sinh viên (US-05.1, US-05.3): gửi cho phòng đang ở, theo dõi tiến độ,
 * xác nhận khi ban quản lý báo đã sửa xong. Chưa hài lòng thì gửi yêu cầu mới.
 */
export function MyMaintenancePage() {
  const requests = useMyMaintenanceRequests()
  const stay = useCurrentStay()
  const confirm = useConfirmMaintenanceRequest()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<MaintenanceRequest | null>(null)

  // Đang ở = hợp đồng đã tới ngày vào ở (kể cả quá hạn mà chưa trả phòng). Backend kiểm tra lại khi gửi.
  const contract = stay.data?.contract
  const living = !!contract && new Date(contract.startDate) <= new Date()
  const selected = requests.data?.find((r) => r.id === selectedId) ?? requests.data?.[0]
  return (
    <>
      <PageHeader title="Sửa chữa" description="Báo hư hỏng trong phòng đang ở và theo dõi tiến độ xử lý." />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gửi yêu cầu mới</CardTitle>
          </CardHeader>
          <CardContent>
            {stay.isPending && <LoadingState />}
            {stay.isSuccess && living && (
              <MaintenanceForm
                roomLabel={`Phòng ${contract.bed.room.code} · Tòa ${contract.bed.room.building.name}`}
                onCreated={() => setSelectedId(null)}
              />
            )}
            {stay.isSuccess && !living && (
              <p className="tone-info rounded-md border p-3 text-sm">
                {contract
                  ? `Bạn gửi được yêu cầu từ ngày vào ở (${formatDate(contract.startDate)}).`
                  : 'Bạn chưa ở phòng nào của KTX nên chưa gửi được yêu cầu sửa chữa.'}
              </p>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          {requests.isPending && <LoadingState />}
          {requests.isError && <ErrorState error={requests.error} />}
          {requests.data?.length === 0 && (
            <Card>
              <CardContent>
                <EmptyState title="Bạn chưa gửi yêu cầu nào" />
              </CardContent>
            </Card>
          )}
          {selected && requests.data && (
            <>
              <Card className="py-2">
                <CardContent className="max-h-80 space-y-1 overflow-y-auto px-2">
                  {requests.data.map((r) => (
                    <SelectableRow
                      key={r.id}
                      active={r.id === selected.id}
                      onClick={() => setSelectedId(r.id)}
                      className="items-start justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        <p className="text-muted-foreground text-xs">
                          Phòng {r.room.code} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge {...REQUEST_STATUS[r.status]} />
                    </SelectableRow>
                  ))}
                </CardContent>
              </Card>
              <RequestDetail request={selected} onConfirm={() => setConfirming(selected)} />
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        target={confirming}
        onClose={() => setConfirming(null)}
        title="Xác nhận đã sửa xong?"
        description={(r) => (
          <>
            Xác nhận <strong>{r.title}</strong> đã được sửa. Yêu cầu sẽ được đóng lại — nếu vẫn còn hư hỏng, hãy gửi
            yêu cầu mới.
          </>
        )}
        confirmLabel="Đã sửa xong"
        cancelLabel="Để sau"
        destructive={false}
        isPending={confirm.isPending}
        onConfirm={(r) => confirm.mutateAsync(r.id).then(() => toast.success(`Đã xác nhận "${r.title}"`))}
      />
    </>
  )
}

function stepTone(r: MaintenanceRequest, reached: boolean, current: boolean) {
  if (current && r.status === 'REJECTED') return 'bg-(--tone-danger-fg) border-(--tone-danger-fg)'
  if (current && r.status !== 'CONFIRMED') return 'bg-(--tone-warning-fg) border-(--tone-warning-fg)'
  return reached ? 'bg-primary border-primary' : 'bg-card border-muted-foreground/40'
}

function RequestDetail({ request: r, onConfirm }: { request: MaintenanceRequest; onConfirm: () => void }) {
  const steps = timeline(r)
  const current = steps.findLastIndex((s) => s.time)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{r.title}</CardTitle>
          <p className="text-muted-foreground text-xs">
            Phòng {r.room.code} · Tòa {r.room.building.name}
          </p>
        </div>
        <StatusBadge {...REQUEST_STATUS[r.status]} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-line">{r.description}</p>
        <ol>
          {steps.map((s, i) => {
            const reached = !!s.time
            return (
              <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={cn('absolute top-4 bottom-0 left-[5px] w-0.5', reached ? 'bg-primary/40' : 'bg-border')} />
                )}
                <span className={cn('relative mt-1 size-3 shrink-0 rounded-full border-2', stepTone(r, reached, i === current))} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', !reached && 'text-muted-foreground')}>{s.title}</p>
                  <p className="text-muted-foreground text-xs">{s.time ?? 'Chưa đến bước này'}</p>
                  {s.note && <p className="mt-1 text-sm">{s.note}</p>}
                </div>
              </li>
            )
          })}
        </ol>
        {r.status === 'DONE' && (
          <div className="tone-success flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <p className="text-sm">Ban quản lý báo đã sửa xong — kiểm tra rồi xác nhận giúp nhé.</p>
            <Button size="sm" onClick={onConfirm}>
              Xác nhận đã sửa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

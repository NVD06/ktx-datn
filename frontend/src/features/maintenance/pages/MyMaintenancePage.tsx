import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DetailList } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentStay } from '@/features/contracts/hooks/useContracts'
import { formatDate } from '@/lib/format'
import { REQUEST_STATUS } from '@/lib/labels'
import type { MaintenanceRequest } from '@/types/maintenance'
import { MaintenanceFormDialog } from '../components/MaintenanceFormDialog'
import { useConfirmMaintenanceRequest, useMyMaintenanceRequests } from '../hooks/useMaintenance'
import { progressRows } from '../maintenance-steps'

/**
 * Yêu cầu sửa chữa của sinh viên (US-05.1, US-05.3): gửi cho phòng đang ở, theo dõi tiến độ,
 * xác nhận khi ban quản lý báo đã sửa xong. Chưa hài lòng thì gửi yêu cầu mới.
 */
export function MyMaintenancePage() {
  const requests = useMyMaintenanceRequests()
  const stay = useCurrentStay()
  const confirm = useConfirmMaintenanceRequest()
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState<MaintenanceRequest | null>(null)

  // Đang ở = hợp đồng đã tới ngày vào ở (kể cả quá hạn mà chưa trả phòng). Backend kiểm tra lại khi gửi.
  const contract = stay.data?.contract
  const living = !!contract && new Date(contract.startDate) <= new Date()

  return (
    <>
      <PageHeader
        title="Sửa chữa"
        description="Báo hư hỏng trong phòng đang ở và theo dõi tiến độ xử lý."
        actions={
          <Button onClick={() => setCreating(true)} disabled={!living}>
            <Plus />
            Gửi yêu cầu
          </Button>
        }
      />

      {stay.isSuccess && !living && (
        <p className="tone-info mb-4 rounded-md border p-3 text-sm">
          {contract
            ? `Bạn gửi được yêu cầu từ ngày vào ở (${formatDate(contract.startDate)}).`
            : 'Bạn chưa ở phòng nào của KTX nên chưa gửi được yêu cầu sửa chữa.'}
        </p>
      )}

      {requests.isPending && <LoadingState />}
      {requests.isError && <ErrorState error={requests.error} />}
      {requests.data?.length === 0 && <EmptyState title="Bạn chưa gửi yêu cầu nào" />}
      {requests.data && requests.data.length > 0 && (
        <div className="space-y-3">
          {requests.data.map((r) => (
            <RequestCard key={r.id} request={r} onConfirm={() => setConfirming(r)} />
          ))}
        </div>
      )}

      {contract && (
        <MaintenanceFormDialog
          open={creating}
          onOpenChange={setCreating}
          roomLabel={`Phòng ${contract.bed.room.code} · Tòa ${contract.bed.room.building.name}`}
        />
      )}
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

function RequestCard({ request: r, onConfirm }: { request: MaintenanceRequest; onConfirm: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{r.title}</CardTitle>
        <CardDescription>
          Phòng {r.room.code} · Tòa {r.room.building.name}
        </CardDescription>
        <CardAction>
          <StatusBadge {...REQUEST_STATUS[r.status]} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailList
          rows={[
            ['Mô tả', r.description, true],
            [r.status === 'REJECTED' ? 'Lý do từ chối' : 'Phản hồi của ban quản lý', r.assigneeNote, true],
            ...progressRows(r),
          ]}
          hideEmpty
        />

        {r.status === 'DONE' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">Ban quản lý báo đã sửa xong — kiểm tra rồi xác nhận giúp nhé.</p>
            <Button size="sm" onClick={onConfirm}>
              Xác nhận đã sửa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

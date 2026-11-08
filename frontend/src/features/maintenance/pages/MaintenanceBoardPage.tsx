import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as maintenanceApi from '@/api/maintenance'
import { getErrorMessage } from '@/api/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuilding } from '@/features/buildings/hooks/useBuildings'
import { useDialogState } from '@/hooks/useDialogState'
import { formatDateTime } from '@/lib/format'
import { REQUEST_STATUS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest, RequestStatus } from '@/types/maintenance'
import { MaintenanceDetailSheet } from '../components/MaintenanceDetailSheet'
import { maintenanceKeys, useUpdateMaintenanceStatus } from '../hooks/useMaintenance'
import { NEXT_STEP } from '../maintenance-steps'

const WEEK = 7 * 24 * 60 * 60 * 1000
const COLUMNS = [
  { title: 'Mới gửi', dot: 'bg-(--tone-info-fg)', statuses: ['PENDING'], order: 'asc' },
  { title: 'Đang xử lý', dot: 'bg-(--tone-warning-fg)', statuses: ['RECEIVED'], order: 'asc' },
  { title: 'Hoàn thành (7 ngày)', dot: 'bg-(--tone-success-fg)', statuses: ['DONE', 'CONFIRMED', 'REJECTED'], order: 'desc' },
] as const satisfies { title: string; dot: string; statuses: RequestStatus[]; order: 'asc' | 'desc' }[]
const STATUSES = COLUMNS.flatMap((c) => c.statuses.map((status) => ({ status, order: c.order })))

const finishedAt = (r: MaintenanceRequest) => r.doneAt ?? r.rejectedAt ?? r.updatedAt

/**
 * Yêu cầu sửa chữa cho ban quản lý (US-05.2): bảng cột theo trạng thái, bấm nút trên thẻ để
 * chuyển bước, từ chối khi còn chờ tiếp nhận. Backend tự giới hạn phạm vi: MANAGER chỉ thấy
 * phòng thuộc tòa mình.
 */
export function MaintenanceBoardPage() {
  const { user } = useAuth()
  const building = useBuilding(user?.role === 'MANAGER' ? (user.buildingId ?? '') : '')
  const [search, setSearch] = useState('')
  const [now] = useState(() => Date.now())
  const queries = useQueries({
    queries: STATUSES.map(({ status, order }) => {
      const params = { status, search: search || undefined, limit: 100, sortBy: 'createdAt', order }
      return { queryKey: maintenanceKeys.list(params), queryFn: () => maintenanceApi.listMaintenanceRequests(params) }
    }),
  })
  const update = useUpdateMaintenanceStatus()
  const detail = useDialogState<MaintenanceRequest>()
  const [rejecting, setRejecting] = useState<MaintenanceRequest | null>(null)

  function step(r: MaintenanceRequest) {
    const next = NEXT_STEP[r.status]!
    detail.setOpen(false)
    update.mutate(
      { id: r.id, status: next.status },
      {
        onSuccess: () => toast.success(`${next.label}: ${r.title}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  function openReject(r: MaintenanceRequest) {
    detail.setOpen(false)
    setRejecting(r)
  }

  const failed = queries.find((q) => q.isError)
  const loaded = queries.every((q) => q.data)
  const items = (statuses: readonly RequestStatus[]) =>
    queries.flatMap((q, i) => (statuses.includes(STATUSES[i].status) ? (q.data?.data ?? []) : []))

  return (
    <>
      <PageHeader
        title={building.data ? `Yêu cầu sửa chữa · Tòa ${building.data.name}` : 'Yêu cầu sửa chữa'}
        description="Bấm nút trên thẻ để chuyển bước. Yêu cầu xong quá 7 ngày thì tìm kiếm để xem lại."
        actions={<SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tiêu đề, phòng, SV" />}
      />

      {failed && <ErrorState error={failed.error} />}
      {!failed && !loaded && <LoadingState />}
      {!failed && loaded && (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const cards =
              column.order === 'desc'
                ? items(column.statuses)
                    .filter((r) => !!search || now - new Date(finishedAt(r)).getTime() <= WEEK)
                    .sort((a, b) => finishedAt(b).localeCompare(finishedAt(a)))
                : items(column.statuses)
            return (
              <section key={column.title} className="bg-muted/60 rounded-xl p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn('size-2.5 rounded-full', column.dot)} />
                  <h2 className="text-sm font-semibold">
                    {search && column.order === 'desc' ? 'Hoàn thành' : column.title}
                  </h2>
                  <span className="text-muted-foreground ml-auto text-xs">{cards.length}</span>
                </div>
                <div className="space-y-3">
                  {cards.length === 0 && (
                    <p className="text-muted-foreground py-6 text-center text-sm">Không có yêu cầu nào</p>
                  )}
                  {cards.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      finished={column.order === 'desc'}
                      pending={update.isPending && update.variables?.id === r.id}
                      onOpen={() => detail.show(r)}
                      onStep={() => step(r)}
                      onReject={() => openReject(r)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <MaintenanceDetailSheet
        request={detail.item}
        open={detail.open}
        onOpenChange={detail.setOpen}
        onStep={step}
        onReject={openReject}
      />
      <ReasonDialog
        target={rejecting}
        onClose={() => setRejecting(null)}
        title="Từ chối yêu cầu sửa chữa"
        description={(r) =>
          `"${r.title}" — phòng ${r.room.code}, tòa ${r.room.building.name}. Sinh viên thấy lý do trên trang Sửa chữa.`
        }
        label="Lý do từ chối"
        placeholder="Ví dụ: hư hỏng do sử dụng sai cách, sinh viên tự sửa…"
        submitLabel="Từ chối yêu cầu"
        isPending={update.isPending}
        closeOnErrorCode="INVALID_STATUS_TRANSITION"
        onSubmit={(r, assigneeNote) =>
          update
            .mutateAsync({ id: r.id, status: 'REJECTED', assigneeNote })
            .then(() => toast.success(`Đã từ chối yêu cầu "${r.title}"`))
        }
      />
    </>
  )
}

function RequestCard({
  request: r,
  finished,
  pending,
  onOpen,
  onStep,
  onReject,
}: {
  request: MaintenanceRequest
  finished: boolean
  pending: boolean
  onOpen: () => void
  onStep: () => void
  onReject: () => void
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="bg-card hover:border-primary/50 cursor-pointer rounded-lg border p-3 shadow-xs transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{r.title}</h3>
        {finished && <StatusBadge {...REQUEST_STATUS[r.status]} />}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Phòng {r.room.code} · Tòa {r.room.building.name}
      </p>
      <p className="mt-2 line-clamp-2 text-sm">{finished && r.assigneeNote ? r.assigneeNote : r.description}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-muted-foreground min-w-0 truncate text-xs">
          {r.student.fullName} · {formatDateTime(finished ? finishedAt(r) : r.createdAt)}
        </p>
        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status === 'PENDING' && (
            <>
              <Button size="sm" variant="ghost" onClick={onReject}>
                Từ chối
              </Button>
              <Button size="sm" disabled={pending} onClick={onStep}>
                Nhận xử lý
              </Button>
            </>
          )}
          {r.status === 'RECEIVED' && (
            <Button size="sm" variant="outline" className="tone-success" disabled={pending} onClick={onStep}>
              Đánh dấu xong
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

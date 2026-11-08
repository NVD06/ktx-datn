import type { ColumnDef } from '@tanstack/react-table'
import { CheckCheck, Eye, Hand, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { REQUEST_STATUS, toOptions } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest, MaintenanceStats } from '@/types/maintenance'
import { MaintenanceDetailSheet } from '../components/MaintenanceDetailSheet'
import { useMaintenanceRequests, useMaintenanceStats, useUpdateMaintenanceStatus } from '../hooks/useMaintenance'
import { NEXT_STEP } from '../maintenance-steps'
import { MaintenanceBoardPage } from './MaintenanceBoardPage'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const
const STATUS_OPTIONS = [{ value: 'OPEN', label: 'Chưa hoàn thành' }, ...toOptions(REQUEST_STATUS)]

export function MaintenanceListPage() {
  const { user } = useAuth()
  return user?.role === 'MANAGER' ? <MaintenanceBoardPage /> : <AdminMaintenancePage />
}

/**
 * Yêu cầu sửa chữa cho admin (US-05.2): số liệu đầu trang, bảng lọc theo tòa / trạng thái,
 * thống kê tháng này ở cột phải. Bấm tiêu đề hoặc menu "…" để chuyển bước, từ chối khi còn chờ
 * tiếp nhận. Quản lý tòa dùng bảng cột ở MaintenanceBoardPage.
 */
function AdminMaintenancePage() {
  const buildings = useBuildings(BUILDING_PARAMS)
  const list = useListParams(['status', 'buildingId'] as const)
  const query = useMaintenanceRequests(list.params)
  const stats = useMaintenanceStats(list.filters.buildingId)
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

  function actions(r: MaintenanceRequest) {
    const next = NEXT_STEP[r.status]
    const items: RowAction[] = [{ label: 'Xem chi tiết', icon: Eye, onSelect: () => detail.show(r) }]
    if (next) items.push({ label: next.label, icon: r.status === 'PENDING' ? Hand : CheckCheck, onSelect: () => step(r) })
    if (r.status === 'PENDING') items.push({ label: 'Từ chối', icon: X, destructive: true, onSelect: () => openReject(r) })
    return items
  }

  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      id: 'title',
      header: 'Nội dung',
      cell: ({ row: { original: r } }) => (
        <button type="button" onClick={() => detail.show(r)} className="max-w-72 text-left">
          <p className="hover:text-primary truncate font-medium">{r.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {r.student.fullName}
            {r.student.profile && ` · ${r.student.profile.studentCode}`}
          </p>
        </button>
      ),
    },
    {
      id: 'room',
      header: 'Phòng',
      cell: ({ row: { original: r } }) => (
        <>
          <p>{r.room.code}</p>
          <p className="text-muted-foreground text-xs">Tòa {r.room.building.name}</p>
        </>
      ),
    },
    {
      id: 'handledBy',
      header: 'Người xử lý',
      cell: ({ row }) => row.original.handledBy?.fullName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'createdAt',
      header: 'Gửi lúc',
      enableSorting: true,
      cell: ({ row }) => <span className="tabular-nums">{formatDateTime(row.original.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      enableSorting: true,
      cell: ({ row }) => <StatusBadge {...REQUEST_STATUS[row.original.status]} />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => <RowActions actions={actions(row.original)} />,
    },
  ]

  const filtered = !!(list.search || list.filters.status || list.filters.buildingId)

  return (
    <>
      <PageHeader
        title="Yêu cầu sửa chữa"
        description="Bấm tiêu đề để xem chi tiết và xử lý. Bấm ô số liệu để lọc theo trạng thái."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          dot="bg-(--tone-warning-fg)"
          label="Mới gửi"
          value={stats.data?.pending}
          active={list.filters.status === 'PENDING'}
          onClick={() => list.setFilter('status', 'PENDING')}
        />
        <StatCard
          dot="bg-(--tone-info-fg)"
          label="Đang xử lý"
          value={stats.data?.received}
          active={list.filters.status === 'RECEIVED'}
          onClick={() => list.setFilter('status', 'RECEIVED')}
        />
        <StatCard
          dot="bg-primary"
          label="Chờ sinh viên xác nhận"
          value={stats.data?.done}
          active={list.filters.status === 'DONE'}
          onClick={() => list.setFilter('status', 'DONE')}
        />
        <StatCard dot="bg-(--tone-success-fg)" label="Hoàn thành tháng này" value={stats.data?.finishedThisMonth} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DataTable
          columns={columns}
          query={query}
          list={list}
          emptyTitle="Không có yêu cầu nào"
          emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Yêu cầu sinh viên gửi sẽ hiện ở đây.'}
          toolbar={
            <>
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tiêu đề, phòng, SV" />
              <FilterSelect
                value={list.filters.buildingId}
                onChange={(v) => list.setFilter('buildingId', v)}
                options={(buildings.data?.data ?? []).map((b) => ({ value: b.id, label: `Tòa ${b.name}` }))}
                allLabel="Tất cả tòa"
              />
              <FilterSelect
                value={list.filters.status}
                onChange={(v) => list.setFilter('status', v)}
                options={STATUS_OPTIONS}
                allLabel="Tất cả trạng thái"
              />
            </>
          }
        />
        {stats.data && <MonthPanel stats={stats.data} />}
      </div>

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

function StatCard({
  dot,
  label,
  value,
  active,
  onClick,
}: {
  dot: string
  label: string
  value: number | undefined
  active?: boolean
  onClick?: () => void
}) {
  const body = (
    <Card className={cn('h-full py-4', onClick && 'hover:bg-accent/50 transition-colors', active && 'ring-primary ring-2')}>
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className={cn('size-2 rounded-full', dot)} />
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">{value ?? '—'}</p>
      </CardContent>
    </Card>
  )
  if (!onClick) return body
  return (
    <button type="button" onClick={onClick} className="focus-visible:ring-ring rounded-xl text-left outline-none focus-visible:ring-2">
      {body}
    </button>
  )
}

function MonthPanel({ stats }: { stats: MaintenanceStats }) {
  const max = Math.max(1, ...stats.groups.map((g) => g.count))
  const hours = stats.avgHours
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {stats.groupBy === 'FLOOR' ? 'Theo tầng' : 'Theo tòa'} · tháng {Number(stats.month.slice(5))}
        </CardTitle>
        <p className="text-muted-foreground text-xs">{stats.createdThisMonth} yêu cầu gửi trong tháng</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.groups.length === 0 && <p className="text-muted-foreground text-sm">Chưa có yêu cầu nào tháng này.</p>}
        {stats.groups.map((g) => (
          <div key={g.label} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{g.label}</span>
              <span className="font-semibold tabular-nums">{g.count}</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${(g.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="space-y-1 border-t pt-4">
          <p className="text-muted-foreground text-xs">Thời gian xử lý trung bình</p>
          <p className="text-2xl font-bold tabular-nums">
            {hours === null
              ? '—'
              : hours >= 24
                ? `${(hours / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày`
                : `${hours.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`}
          </p>
          <p className="text-muted-foreground text-xs">
            Từ lúc gửi tới lúc sửa xong · {stats.finishedThisMonth} yêu cầu xong trong tháng
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

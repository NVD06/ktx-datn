import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, Eye, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { REQUEST_STATUS, toOptions } from '@/lib/labels'
import type { MaintenanceRequest } from '@/types/maintenance'
import { MaintenanceDetailSheet } from '../components/MaintenanceDetailSheet'
import { useMaintenanceRequests, useUpdateMaintenanceStatus } from '../hooks/useMaintenance'
import { NEXT_STEP } from '../maintenance-steps'

const STATUS_OPTIONS = toOptions(REQUEST_STATUS)

/**
 * Yêu cầu sửa chữa cho ban quản lý (US-05.2): chuyển lần lượt từng bước, từ chối khi còn
 * chờ tiếp nhận. Backend tự giới hạn phạm vi: MANAGER chỉ thấy phòng thuộc tòa mình.
 */
export function MaintenanceListPage() {
  const { user } = useAuth()
  const list = useListParams(['status'] as const)
  const query = useMaintenanceRequests(list.params)
  const update = useUpdateMaintenanceStatus()

  const detail = useDialogState<MaintenanceRequest>()
  const [stepping, setStepping] = useState<MaintenanceRequest | null>(null)
  const [rejecting, setRejecting] = useState<MaintenanceRequest | null>(null)

  // Bấm từ drawer: đóng drawer để dialog không chồng lên nó.
  function openStep(request: MaintenanceRequest) {
    detail.setOpen(false)
    setStepping(request)
  }

  function openReject(request: MaintenanceRequest) {
    detail.setOpen(false)
    setRejecting(request)
  }

  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      id: 'title',
      header: 'Yêu cầu',
      cell: ({ row }) => (
        <div className="max-w-80">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="text-muted-foreground truncate text-xs">{row.original.description}</p>
        </div>
      ),
    },
    {
      id: 'room',
      header: 'Phòng',
      cell: ({ row }) => `${row.original.room.code} · Tòa ${row.original.room.building.name}`,
    },
    {
      id: 'student',
      header: 'Sinh viên',
      cell: ({ row }) => {
        const { student } = row.original
        return (
          <div>
            <p className="font-medium">{student.fullName}</p>
            <p className="text-muted-foreground text-xs">{student.profile?.studentCode ?? student.email}</p>
          </div>
        )
      },
    },
    {
      id: 'createdAt',
      header: 'Gửi lúc',
      enableSorting: true,
      cell: ({ row }) => formatDateTime(row.original.createdAt),
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
      cell: ({ row }) => {
        const request = row.original
        const step = NEXT_STEP[request.status]
        const actions: RowAction[] = [{ label: 'Xem chi tiết', icon: Eye, onSelect: () => detail.show(request) }]
        if (step) actions.push({ label: step.label, icon: ArrowRight, onSelect: () => openStep(request) })
        if (request.status === 'PENDING') {
          actions.push({ label: 'Từ chối', icon: XCircle, destructive: true, onSelect: () => openReject(request) })
        }
        return <RowActions actions={actions} />
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Sửa chữa"
        description={
          user?.role === 'ADMIN'
            ? 'Yêu cầu sửa chữa của sinh viên ở mọi tòa nhà.'
            : 'Yêu cầu sửa chữa của sinh viên các phòng thuộc tòa bạn quản lý.'
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có yêu cầu sửa chữa nào"
        emptyDescription={list.search || list.filters.status ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tiêu đề, phòng, SV" />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter('status', v)}
              options={STATUS_OPTIONS}
              allLabel="Trạng thái"
            />
          </>
        }
      />

      <MaintenanceDetailSheet
        request={detail.item}
        open={detail.open}
        onOpenChange={detail.setOpen}
        onStep={openStep}
        onReject={openReject}
      />
      <ConfirmDialog
        target={stepping}
        onClose={() => setStepping(null)}
        title="Cập nhật tiến độ sửa chữa?"
        description={(r) => (
          <>
            Yêu cầu <strong>{r.title}</strong> (phòng {r.room.code}, tòa {r.room.building.name}) sẽ chuyển sang{' '}
            <strong>{REQUEST_STATUS[NEXT_STEP[r.status]!.status].label}</strong>. Sinh viên thấy tiến độ trên trang Sửa
            chữa.
          </>
        )}
        confirmLabel="Cập nhật"
        destructive={false}
        isPending={update.isPending}
        onConfirm={(r) => {
          const step = NEXT_STEP[r.status]!
          return update.mutateAsync({ id: r.id, status: step.status }).then(() => toast.success(`${step.label}: ${r.title}`))
        }}
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

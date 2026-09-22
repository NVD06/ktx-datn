import type { ColumnDef } from '@tanstack/react-table'
import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useListParams } from '@/hooks/useListParams'
import { formatDateRange } from '@/lib/format'
import { PERIOD_STATUS } from '@/lib/labels'
import type { RegistrationPeriod } from '@/types/registration'
import { RegistrationPeriodFormDialog } from '../components/RegistrationPeriodFormDialog'
import {
  useDeleteRegistrationPeriod,
  useRegistrationPeriods,
  useToggleRegistrationPeriod,
} from '../hooks/useRegistrationPeriods'

const OPEN_OPTIONS = [
  { value: 'true', label: PERIOD_STATUS.OPEN.label },
  { value: 'false', label: PERIOD_STATUS.CLOSED.label },
]

/** Đợt đăng ký ở KTX — ADMIN thêm/sửa/xóa và mở/đóng, MANAGER chỉ xem. */
export function RegistrationPeriodListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const list = useListParams(['isOpen'] as const)
  const query = useRegistrationPeriods(list.params)
  const toggle = useToggleRegistrationPeriod()
  const remove = useDeleteRegistrationPeriod()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RegistrationPeriod | null>(null)
  const [toggling, setToggling] = useState<RegistrationPeriod | null>(null)
  const [deleting, setDeleting] = useState<RegistrationPeriod | null>(null)

  function openForm(period: RegistrationPeriod | null) {
    setEditing(period)
    setFormOpen(true)
  }

  function confirmToggle() {
    if (!toggling) return
    const { id, name, isOpen } = toggling
    toggle.mutate(
      { id, open: !isOpen },
      {
        onSuccess: () => toast.success(isOpen ? `Đã đóng đợt "${name}"` : `Đã mở đợt "${name}"`),
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setToggling(null),
      },
    )
  }

  function confirmDelete() {
    if (!deleting) return
    const { id, name } = deleting
    remove.mutate(id, {
      onSuccess: () => toast.success(`Đã xóa đợt "${name}"`),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setDeleting(null),
    })
  }

  const columns: ColumnDef<RegistrationPeriod>[] = [
    {
      id: 'name',
      header: 'Tên đợt',
      enableSorting: true,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'startAt',
      header: 'Nhận đơn',
      enableSorting: true,
      cell: ({ row }) => formatDateRange(row.original.startAt, row.original.endAt),
    },
    {
      id: 'stay',
      header: 'Thời gian ở',
      cell: ({ row }) => formatDateRange(row.original.stayStartAt, row.original.stayEndAt),
    },
    {
      id: 'registrationCount',
      header: 'Số đơn',
      meta: { className: 'text-right' },
      cell: ({ row }) => row.original.registrationCount,
    },
    {
      id: 'isOpen',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = PERIOD_STATUS[row.original.isOpen ? 'OPEN' : 'CLOSED']
        return <StatusBadge label={status.label} tone={status.tone} />
      },
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: '',
            meta: { className: 'w-12 text-right' },
            cell: ({ row }) => (
              <RowActions
                actions={[
                  row.original.isOpen
                    ? { label: 'Đóng đợt', icon: Lock, onSelect: () => setToggling(row.original) }
                    : { label: 'Mở đợt', icon: LockOpen, onSelect: () => setToggling(row.original) },
                  { label: 'Sửa', icon: Pencil, onSelect: () => openForm(row.original) },
                  {
                    label: 'Xóa',
                    icon: Trash2,
                    destructive: true,
                    onSelect: () => setDeleting(row.original),
                  },
                ]}
              />
            ),
          } satisfies ColumnDef<RegistrationPeriod>,
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Đợt đăng ký"
        description={
          isAdmin
            ? 'Sinh viên chỉ nộp được đơn khi có đợt đang mở. Tại một thời điểm chỉ mở được 1 đợt.'
            : 'Các đợt đăng ký ở KTX. Chỉ quản trị viên được mở/đóng đợt.'
        }
        actions={
          isAdmin && (
            <Button onClick={() => openForm(null)}>
              <Plus />
              Thêm đợt đăng ký
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        sortBy={list.sortBy}
        order={list.order}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        emptyTitle="Chưa có đợt đăng ký nào"
        emptyDescription={list.search || list.filters.isOpen ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên đợt" />
            <FilterSelect
              value={list.filters.isOpen}
              onChange={(v) => list.setFilter('isOpen', v)}
              options={OPEN_OPTIONS}
              allLabel="Các trạng thái"
            />
          </>
        }
      />

      <RegistrationPeriodFormDialog open={formOpen} onOpenChange={setFormOpen} period={editing} />

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.isOpen ? 'Đóng đợt đăng ký?' : 'Mở đợt đăng ký?'}
        description={
          <>
            {toggling?.isOpen ? 'Đóng' : 'Mở'} đợt <strong>{toggling?.name}</strong>.{' '}
            {toggling?.isOpen
              ? 'Sinh viên sẽ không nộp đơn mới được nữa; các đơn đã nộp vẫn được giữ để duyệt.'
              : 'Sinh viên nộp được đơn cho tới khi đóng đợt. Chỉ mở được khi không có đợt khác đang mở.'}
          </>
        }
        confirmLabel={toggling?.isOpen ? 'Đóng đợt' : 'Mở đợt'}
        destructive={!!toggling?.isOpen}
        isPending={toggle.isPending}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa đợt đăng ký?"
        description={
          <>
            Xóa đợt <strong>{deleting?.name}</strong>. Đợt đang mở hoặc đã có đơn đăng ký sẽ không xóa
            được.
          </>
        }
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}

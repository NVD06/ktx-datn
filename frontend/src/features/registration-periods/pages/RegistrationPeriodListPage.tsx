import type { ColumnDef } from '@tanstack/react-table'
import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDateRange } from '@/lib/format'
import { PERIOD_OPTIONS, PERIOD_STATUS } from '@/lib/labels'
import type { RegistrationPeriod } from '@/types/registration'
import { RegistrationPeriodFormDialog } from '../components/RegistrationPeriodFormDialog'
import {
  useDeleteRegistrationPeriod,
  useRegistrationPeriods,
  useToggleRegistrationPeriod,
} from '../hooks/useRegistrationPeriods'

/** Đợt đăng ký ở KTX — ADMIN thêm/sửa/xóa và mở/đóng, MANAGER chỉ xem. */
export function RegistrationPeriodListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const list = useListParams(['isOpen'] as const)
  const query = useRegistrationPeriods(list.params)
  const toggle = useToggleRegistrationPeriod()
  const remove = useDeleteRegistrationPeriod()

  const form = useDialogState<RegistrationPeriod>()
  const [toggling, setToggling] = useState<RegistrationPeriod | null>(null)
  const [deleting, setDeleting] = useState<RegistrationPeriod | null>(null)

  const columns: ColumnDef<RegistrationPeriod>[] = [
    {
      id: 'name',
      header: 'Tên đợt',
      enableSorting: true,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'term',
      header: 'Học kỳ',
      cell: ({ row }) => row.original.term,
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
      cell: ({ row }) => (
        <StatusBadge {...PERIOD_STATUS[row.original.isOpen ? 'OPEN' : 'CLOSED']} />
      ),
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
                  { label: 'Sửa', icon: Pencil, onSelect: () => form.show(row.original) },
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
            <Button onClick={() => form.show(null)}>
              <Plus />
              Thêm đợt đăng ký
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có đợt đăng ký nào"
        emptyDescription={list.search || list.filters.isOpen ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên đợt" />
            <FilterSelect
              value={list.filters.isOpen}
              onChange={(v) => list.setFilter('isOpen', v)}
              options={PERIOD_OPTIONS}
              allLabel="Trạng thái"
            />
          </>
        }
      />

      <RegistrationPeriodFormDialog open={form.open} onOpenChange={form.setOpen} period={form.item} />

      <ConfirmDialog
        target={toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isOpen ? 'Đóng đợt đăng ký?' : 'Mở đợt đăng ký?'}
        description={(p) => (
          <>
            {p.isOpen ? 'Đóng' : 'Mở'} đợt <strong>{p.name}</strong>.{' '}
            {p.isOpen
              ? 'Sinh viên sẽ không nộp đơn mới được nữa; các đơn đã nộp vẫn được giữ để duyệt.'
              : 'Sinh viên nộp được đơn cho tới khi đóng đợt. Chỉ mở được khi không có đợt khác đang mở.'}
          </>
        )}
        confirmLabel={toggling?.isOpen ? 'Đóng đợt' : 'Mở đợt'}
        destructive={!!toggling?.isOpen}
        isPending={toggle.isPending}
        onConfirm={(p) =>
          toggle
            .mutateAsync({ id: p.id, open: !p.isOpen })
            .then(() => toast.success(p.isOpen ? `Đã đóng đợt "${p.name}"` : `Đã mở đợt "${p.name}"`))
        }
      />

      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa đợt đăng ký?"
        description={(p) => (
          <>
            Xóa đợt <strong>{p.name}</strong>. Đợt đang mở hoặc đã có đơn đăng ký sẽ không xóa được.
          </>
        )}
        isPending={remove.isPending}
        onConfirm={(p) => remove.mutateAsync(p.id).then(() => toast.success(`Đã xóa đợt "${p.name}"`))}
      />
    </>
  )
}

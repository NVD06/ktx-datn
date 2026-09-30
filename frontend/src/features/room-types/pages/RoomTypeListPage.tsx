import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { formatMoney } from '@/lib/format'
import { ACTIVE_OPTIONS, activeStatus } from '@/lib/labels'
import type { RoomType } from '@/types/facility'
import { RoomTypeFormDialog } from '../components/RoomTypeFormDialog'
import { useDeleteRoomType, useRoomTypes } from '../hooks/useRoomTypes'

/** Danh mục loại phòng — ADMIN thêm/sửa/xóa, MANAGER chỉ xem. */
export function RoomTypeListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const list = useListParams(['isActive'] as const)
  const query = useRoomTypes(list.params)
  const remove = useDeleteRoomType()

  const form = useDialogState<RoomType>()
  const [deleting, setDeleting] = useState<RoomType | null>(null)

  const columns: ColumnDef<RoomType>[] = [
    {
      id: 'name',
      header: 'Tên loại phòng',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="max-w-80 whitespace-normal">
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'capacity',
      header: 'Sức chứa',
      enableSorting: true,
      meta: { className: 'text-right' },
      cell: ({ row }) => `${row.original.capacity} giường`,
    },
    {
      id: 'price',
      header: 'Giá / tháng',
      enableSorting: true,
      meta: { className: 'text-right' },
      cell: ({ row }) => formatMoney(row.original.price),
    },
    {
      id: 'roomCount',
      header: 'Số phòng dùng',
      meta: { className: 'text-right' },
      cell: ({ row }) => row.original.roomCount,
    },
    {
      id: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge {...activeStatus(row.original.isActive)} />,
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
          } satisfies ColumnDef<RoomType>,
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Loại phòng"
        description={
          isAdmin
            ? 'Danh mục dùng chung cho mọi tòa nhà — quyết định sức chứa và giá của phòng.'
            : 'Danh mục dùng chung cho mọi tòa nhà. Chỉ quản trị viên được thay đổi.'
        }
        actions={
          isAdmin && (
            <Button onClick={() => form.show(null)}>
              <Plus />
              Thêm loại phòng
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Không có loại phòng nào"
        emptyDescription={list.search || list.filters.isActive ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Tìm theo tên loại phòng"
            />
            <FilterSelect
              value={list.filters.isActive}
              onChange={(v) => list.setFilter('isActive', v)}
              options={ACTIVE_OPTIONS}
              allLabel="Trạng thái"
            />
          </>
        }
      />

      <RoomTypeFormDialog open={form.open} onOpenChange={form.setOpen} roomType={form.item} />

      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa loại phòng?"
        description={(t) => (
          <>
            Xóa loại phòng <strong>{t.name}</strong>. Loại phòng đang có phòng sử dụng sẽ không xóa
            được — khi đó hãy chuyển sang ngừng hoạt động.
          </>
        )}
        isPending={remove.isPending}
        onConfirm={(t) => remove.mutateAsync(t.id).then(() => toast.success(`Đã xóa loại phòng "${t.name}"`))}
      />
    </>
  )
}

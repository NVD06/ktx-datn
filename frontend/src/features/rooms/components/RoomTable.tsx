import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useRoomTypeOptions } from '@/features/room-types/hooks/useRoomTypes'
import { useListParams } from '@/hooks/useListParams'
import { formatMoney } from '@/lib/format'
import { ACTIVE_STATUS, ROOM_STATUS } from '@/lib/labels'
import type { Building, Room } from '@/types/facility'
import { useBuildingRooms, useDeleteRoom } from '../hooks/useRooms'
import { RoomFormDialog } from './RoomFormDialog'

const STATUS_OPTIONS = Object.entries(ROOM_STATUS).map(([value, { label }]) => ({ value, label }))

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

/** Bảng phòng của một tòa, lọc theo tầng / loại phòng / trạng thái — tất cả ở server. */
export function RoomTable({ building }: { building: Pick<Building, 'id' | 'name' | 'floors'> }) {
  const navigate = useNavigate()
  const list = useListParams(['floor', 'roomTypeId', 'status', 'isActive'] as const)
  const query = useBuildingRooms(building.id, list.params)
  const roomTypes = useRoomTypeOptions()
  const remove = useDeleteRoom()

  const [editing, setEditing] = useState<Room | null>(null)
  const [deleting, setDeleting] = useState<Room | null>(null)

  const floorOptions = Array.from({ length: building.floors }, (_, i) => ({
    value: String(i + 1),
    label: `Tầng ${i + 1}`,
  }))
  const roomTypeOptions = (roomTypes.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }))
  const hasFilter = Object.values(list.filters).some(Boolean) || !!list.search

  function confirmDelete() {
    if (!deleting) return
    const { id, code } = deleting
    remove.mutate(id, {
      onSuccess: () => toast.success(`Đã xóa phòng ${code}`),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setDeleting(null),
    })
  }

  const columns: ColumnDef<Room>[] = [
    {
      id: 'code',
      header: 'Phòng',
      enableSorting: true,
      cell: ({ row }) => (
        <Link
          to={`/admin/rooms/${row.original.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      id: 'floor',
      header: 'Tầng',
      enableSorting: true,
      meta: { className: 'text-right' },
      cell: ({ row }) => row.original.floor,
    },
    {
      id: 'roomType',
      header: 'Loại phòng',
      cell: ({ row }) => (
        <div>
          <p>{row.original.roomType.name}</p>
          <p className="text-muted-foreground text-xs">{formatMoney(row.original.roomType.price)} / kỳ</p>
        </div>
      ),
    },
    {
      id: 'beds',
      header: 'Giường trống',
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.availableBeds}
          <span className="text-muted-foreground">/{row.original.bedCount}</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = ROOM_STATUS[row.original.status]
        return (
          <div className="flex gap-1">
            <StatusBadge label={status.label} tone={status.tone} />
            {!row.original.isActive && (
              <StatusBadge label={ACTIVE_STATUS.INACTIVE.label} tone={ACTIVE_STATUS.INACTIVE.tone} />
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => (
        <RowActions
          actions={[
            {
              label: 'Xem giường',
              icon: Eye,
              onSelect: () => void navigate(`/admin/rooms/${row.original.id}`),
            },
            { label: 'Sửa', icon: Pencil, onSelect: () => setEditing(row.original) },
            {
              label: 'Xóa',
              icon: Trash2,
              destructive: true,
              onSelect: () => setDeleting(row.original),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <>
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
        emptyTitle={hasFilter ? 'Không có phòng nào khớp bộ lọc' : 'Tòa nhà chưa có phòng'}
        emptyDescription={hasFilter ? 'Thử bỏ bớt bộ lọc.' : 'Bấm “Thêm phòng” để tạo phòng đầu tiên.'}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm mã phòng" />
            <FilterSelect
              value={list.filters.floor}
              onChange={(v) => list.setFilter('floor', v)}
              options={floorOptions}
              allLabel="Mọi tầng"
            />
            <FilterSelect
              value={list.filters.roomTypeId}
              onChange={(v) => list.setFilter('roomTypeId', v)}
              options={roomTypeOptions}
              allLabel="Mọi loại phòng"
            />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter('status', v)}
              options={STATUS_OPTIONS}
              allLabel="Mọi tình trạng"
            />
            <FilterSelect
              value={list.filters.isActive}
              onChange={(v) => list.setFilter('isActive', v)}
              options={ACTIVE_OPTIONS}
              allLabel="Hoạt động & ngừng"
            />
          </>
        }
      />

      <RoomFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        building={building}
        room={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa phòng?"
        description={
          <>
            Xóa phòng <strong>{deleting?.code}</strong> cùng toàn bộ giường. Phòng đã có hợp đồng
            hoặc lịch sử sửa chữa sẽ không xóa được — khi đó hãy chuyển sang ngừng hoạt động.
          </>
        }
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}

import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useRoomTypeOptions } from '@/features/room-types/hooks/useRoomTypes'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatMoney } from '@/lib/format'
import { ACTIVE_OPTIONS, ACTIVE_STATUS, ROOM_STATUS } from '@/lib/labels'
import type { Building, Room } from '@/types/facility'
import { useBuildingRooms, useDeleteRoom } from '../hooks/useRooms'
import { RoomFormDialog } from './RoomFormDialog'

const STATUS_OPTIONS = Object.entries(ROOM_STATUS).map(([value, { label }]) => ({ value, label }))

/** Bảng phòng của một tòa, lọc theo tầng / loại phòng / trạng thái — tất cả ở server. */
export function RoomTable({ building }: { building: Pick<Building, 'id' | 'name' | 'floors'> }) {
  const navigate = useNavigate()
  const list = useListParams(['floor', 'roomTypeId', 'status', 'isActive'] as const)
  const query = useBuildingRooms(building.id, list.params)
  const roomTypes = useRoomTypeOptions()
  const remove = useDeleteRoom()

  const edit = useDialogState<Room>()
  const [deleting, setDeleting] = useState<Room | null>(null)

  const floorOptions = Array.from({ length: building.floors }, (_, i) => ({
    value: String(i + 1),
    label: `Tầng ${i + 1}`,
  }))
  const roomTypeOptions = (roomTypes.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }))
  const hasFilter = Object.values(list.filters).some(Boolean) || !!list.search

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
      cell: ({ row }) => (
        <div className="flex gap-1">
          <StatusBadge {...ROOM_STATUS[row.original.status]} />
          {!row.original.isActive && <StatusBadge {...ACTIVE_STATUS.INACTIVE} />}
        </div>
      ),
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
            { label: 'Sửa', icon: Pencil, onSelect: () => edit.show(row.original) },
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
        query={query}
        list={list}
        emptyTitle={hasFilter ? 'Không có phòng nào khớp bộ lọc' : 'Tòa nhà chưa có phòng'}
        emptyDescription={hasFilter ? 'Thử bỏ bớt bộ lọc.' : 'Bấm “Thêm phòng” để tạo phòng đầu tiên.'}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm mã phòng" />
            <FilterSelect
              value={list.filters.floor}
              onChange={(v) => list.setFilter('floor', v)}
              options={floorOptions}
              allLabel="Tầng"
            />
            <FilterSelect
              value={list.filters.roomTypeId}
              onChange={(v) => list.setFilter('roomTypeId', v)}
              options={roomTypeOptions}
              allLabel="Loại phòng"
            />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter('status', v)}
              options={STATUS_OPTIONS}
              allLabel="Tình trạng"
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
        open={edit.open}
        onOpenChange={edit.setOpen}
        building={building}
        room={edit.item}
      />

      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa phòng?"
        description={(r) => (
          <>
            Xóa phòng <strong>{r.code}</strong> cùng toàn bộ giường. Phòng đã có hợp đồng hoặc lịch sử
            sửa chữa sẽ không xóa được — khi đó hãy chuyển sang ngừng hoạt động.
          </>
        )}
        isPending={remove.isPending}
        onConfirm={(r) => remove.mutateAsync(r.id).then(() => toast.success(`Đã xóa phòng ${r.code}`))}
      />
    </>
  )
}

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { BackLink } from '@/components/shared/BackLink'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { ACTIVE_STATUS, BED_STATUS, ROOM_STATUS } from '@/lib/labels'
import { BedGrid } from '../components/BedGrid'
import { RoomFormDialog } from '../components/RoomFormDialog'
import { useCreateBed, useDeleteRoom, useRoom } from '../hooks/useRooms'

/** Chi tiết phòng + sơ đồ giường (US-01.4). */
export function RoomDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const query = useRoom(id)
  const createBed = useCreateBed()
  const removeRoom = useDeleteRoom()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (query.isPending) return <LoadingState />

  if (query.isError) {
    return (
      <>
        <BackLink to="/admin/buildings">Danh sách tòa nhà</BackLink>
        <ErrorState error={query.error} />
      </>
    )
  }

  const room = query.data
  const status = ROOM_STATUS[room.status]
  const isFull = room.bedCount >= room.roomType.capacity

  function addBed() {
    createBed.mutate(room.id, {
      onSuccess: (bed) => toast.success(`Đã thêm giường ${bed.code}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  function confirmDelete() {
    removeRoom.mutate(room.id, {
      onSuccess() {
        toast.success(`Đã xóa phòng ${room.code}`)
        void navigate(`/admin/buildings/${room.building.id}`, { replace: true })
      },
      onError(error) {
        toast.error(getErrorMessage(error))
        setDeleteOpen(false)
      },
    })
  }

  return (
    <>
      <BackLink to={`/admin/buildings/${room.building.id}`}>Tòa {room.building.name}</BackLink>
      <PageHeader
        title={`Phòng ${room.code}`}
        description={`Tòa ${room.building.name} · Tầng ${room.floor} · ${room.roomType.name}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              Xóa phòng
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Sửa phòng
            </Button>
            <Button
              onClick={addBed}
              disabled={isFull || createBed.isPending}
              title={isFull ? `Đã đủ ${room.roomType.capacity} giường theo loại phòng` : undefined}
            >
              <Plus />
              Thêm giường
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tình trạng">
          <div className="flex flex-wrap gap-1">
            <StatusBadge label={status.label} tone={status.tone} />
            {!room.isActive && (
              <StatusBadge label={ACTIVE_STATUS.INACTIVE.label} tone={ACTIVE_STATUS.INACTIVE.tone} />
            )}
          </div>
        </StatCard>
        <StatCard label="Giường">
          {room.bedCount}
          <span className="text-muted-foreground text-sm font-normal">
            {' '}
            / sức chứa {room.roomType.capacity}
          </span>
        </StatCard>
        <StatCard label="Phân bố">
          <span className="text-sm font-normal">
            {BED_STATUS.AVAILABLE.label} {room.availableBeds} · {BED_STATUS.OCCUPIED.label}{' '}
            {room.occupiedBeds} · {BED_STATUS.MAINTENANCE.label} {room.maintenanceBeds}
          </span>
        </StatCard>
        <StatCard label="Giá / kỳ / sinh viên">{formatMoney(room.roomType.price)}</StatCard>
      </div>

      <h2 className="mb-3 text-base font-semibold">Sơ đồ giường</h2>
      <BedGrid beds={room.beds} />

      <RoomFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        building={room.building}
        room={room}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa phòng?"
        description={
          <>
            Xóa phòng <strong>{room.code}</strong> cùng {room.bedCount} giường. Phòng đã có hợp đồng
            hoặc lịch sử sửa chữa sẽ không xóa được — khi đó hãy chuyển sang ngừng hoạt động.
          </>
        }
        isPending={removeRoom.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}

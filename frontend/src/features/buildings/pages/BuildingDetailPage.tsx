import { Pencil, Plus, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RoomFormDialog } from '@/features/rooms/components/RoomFormDialog'
import { RoomTable } from '@/features/rooms/components/RoomTable'
import { orDash } from '@/lib/format'
import { activeStatus, GENDER } from '@/lib/labels'
import { AssignManagerDialog } from '../components/AssignManagerDialog'
import { BuildingFormDialog } from '../components/BuildingFormDialog'
import { useBuilding } from '../hooks/useBuildings'

/**
 * Chi tiết tòa nhà + bảng phòng (US-01.3).
 * MANAGER mở tòa không được gán sẽ nhận 403 từ backend và thấy thông báo lỗi.
 */
export function BuildingDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const query = useBuilding(id)

  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)

  if (query.isPending) return <LoadingState />

  if (query.isError) {
    return (
      <>
        <BackLink to="/admin/buildings">Danh sách tòa nhà</BackLink>
        <ErrorState error={query.error} />
      </>
    )
  }

  const building = query.data

  return (
    <>
      <BackLink to="/admin/buildings">Danh sách tòa nhà</BackLink>
      <PageHeader
        title={`Tòa ${building.name}`}
        description={orDash(building.description)}
        actions={
          <>
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => setAssignOpen(true)}>
                  <UserCog />
                  Gán quản lý
                </Button>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Sửa tòa
                </Button>
              </>
            )}
            <Button
              onClick={() => setCreateRoomOpen(true)}
              disabled={!building.isActive}
              title={building.isActive ? undefined : 'Tòa đang ngừng hoạt động'}
            >
              <Plus />
              Thêm phòng
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Số phòng">
          {building.roomCount}
          <span className="text-muted-foreground text-sm font-normal"> / {building.floors} tầng</span>
        </StatCard>
        <StatCard label="Giới tính ở">
          <StatusBadge {...GENDER[building.gender]} />
        </StatCard>
        <StatCard label="Quản lý">
          <span className="text-sm">{building.manager?.fullName ?? 'Chưa gán'}</span>
        </StatCard>
        <StatCard label="Trạng thái">
          <StatusBadge {...activeStatus(building.isActive)} />
        </StatCard>
      </div>

      <RoomTable building={building} />

      <BuildingFormDialog open={editOpen} onOpenChange={setEditOpen} building={building} />
      <AssignManagerDialog open={assignOpen} onOpenChange={setAssignOpen} building={building} />
      <RoomFormDialog open={createRoomOpen} onOpenChange={setCreateRoomOpen} building={building} />
    </>
  )
}

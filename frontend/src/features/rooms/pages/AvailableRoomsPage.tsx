import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useListParams } from '@/hooks/useListParams'
import { formatMoney } from '@/lib/format'
import { GENDER, MIXED_GENDER } from '@/lib/labels'
import { useAvailableRoomOptions, useAvailableRooms } from '../hooks/useRooms'

/**
 * Phòng còn chỗ cho sinh viên (US-02.2). Chỉ gồm phòng đang nhận người — backend
 * đã lọc tòa/phòng/loại phòng ngừng hoạt động, chỉ trả tòa cùng giới tính với
 * sinh viên và tòa hỗn hợp, và không trả thông tin giường.
 */
export function AvailableRoomsPage() {
  const list = useListParams(['buildingId', 'roomTypeId'] as const)
  const query = useAvailableRooms({ ...list.params, sortBy: 'code', order: 'asc' })
  const options = useAvailableRoomOptions()

  const buildingOptions = (options.data?.buildings ?? []).map((b) => ({
    value: b.id,
    label: `Tòa ${b.name} (${(b.gender ? GENDER[b.gender] : MIXED_GENDER).label})`,
  }))
  const roomTypeOptions = (options.data?.roomTypes ?? []).map((t) => ({
    value: t.id,
    label: t.name,
  }))
  const filtered = list.search || list.filters.buildingId || list.filters.roomTypeId

  return (
    <>
      <PageHeader
        title="Phòng còn chỗ"
        description="Các phòng còn giường trống ở tòa dành cho giới tính của bạn và tòa hỗn hợp. Giá tính cho một sinh viên trong một kỳ."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm mã phòng" />
        <FilterSelect
          value={list.filters.buildingId}
          onChange={(v) => list.setFilter('buildingId', v)}
          options={buildingOptions}
          allLabel="Các tòa nhà"
        />
        <FilterSelect
          value={list.filters.roomTypeId}
          onChange={(v) => list.setFilter('roomTypeId', v)}
          options={roomTypeOptions}
          allLabel="Các loại phòng"
        />
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} />}
      {query.data?.data.length === 0 && (
        <EmptyState
          title="Không có phòng còn chỗ"
          description={filtered ? 'Thử bỏ bớt bộ lọc.' : undefined}
        />
      )}

      {query.data && query.data.data.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.data.map((room) => {
              const gender = room.building.gender ? GENDER[room.building.gender] : MIXED_GENDER
              return (
                <Card key={room.id}>
                  <CardHeader>
                    <CardTitle>Phòng {room.code}</CardTitle>
                    <CardDescription>
                      Tòa {room.building.name} · Tầng {room.floor}
                    </CardDescription>
                    <CardAction>
                      <StatusBadge label={gender.label} tone={gender.tone} />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-muted-foreground">{room.roomType.name}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {formatMoney(room.roomType.price)}
                        <span className="text-muted-foreground font-normal"> / kỳ</span>
                      </p>
                      <span className="tone-success rounded-md border px-2 py-0.5 text-xs font-medium">
                        Còn {room.availableBeds}/{room.roomType.capacity} chỗ
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Pagination meta={query.data.meta} onPageChange={list.setPage} />
        </div>
      )}
    </>
  )
}

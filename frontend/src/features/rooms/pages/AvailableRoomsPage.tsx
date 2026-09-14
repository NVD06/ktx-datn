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
import { useAvailableRooms } from '../hooks/useRooms'

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Tòa nam & hỗn hợp' },
  { value: 'FEMALE', label: 'Tòa nữ & hỗn hợp' },
]

/**
 * Phòng còn chỗ cho sinh viên (US-01.5). Chỉ gồm phòng đang nhận người — backend
 * đã lọc tòa/phòng/loại phòng ngừng hoạt động và không trả thông tin giường.
 */
export function AvailableRoomsPage() {
  const list = useListParams(['gender'] as const)
  const query = useAvailableRooms({ ...list.params, sortBy: 'code', order: 'asc' })

  return (
    <>
      <PageHeader
        title="Phòng còn chỗ"
        description="Các phòng đang còn giường trống. Giá tính cho một sinh viên trong một kỳ."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm mã phòng" />
        <FilterSelect
          value={list.filters.gender}
          onChange={(v) => list.setFilter('gender', v)}
          options={GENDER_OPTIONS}
          allLabel="Mọi tòa"
        />
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} />}
      {query.data?.data.length === 0 && (
        <EmptyState
          title="Không có phòng còn chỗ"
          description={list.search || list.filters.gender ? 'Thử bỏ bớt bộ lọc.' : undefined}
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

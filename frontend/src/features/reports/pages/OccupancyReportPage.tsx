import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { useListParams } from '@/hooks/useListParams'
import { BuildingOccupancy } from '../components/BuildingOccupancy'
import { useOccupancyReport } from '../hooks/useReports'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const

/**
 * Báo cáo lấp đầy (US-06.2): mỗi tòa một khối, chia theo tầng → phòng. Chỉ tính phòng đang hoạt
 * động, nên tổng các tòa bằng ô "Tỷ lệ lấp đầy" ở Tổng quan. Admin lọc theo tòa (lưu trên URL);
 * Manager chỉ có tòa mình nên không có bộ lọc.
 */
export function OccupancyReportPage() {
  const { user } = useAuth()
  const list = useListParams(['buildingId'] as const)
  const report = useOccupancyReport(list.filters.buildingId)
  const buildings = useBuildings(BUILDING_PARAMS)
  const buildingOptions = (buildings.data?.data ?? []).map((b) => ({ value: b.id, label: `Tòa ${b.name}` }))

  return (
    <div className="space-y-4">
      {user?.role === 'ADMIN' && (
        <div className="flex">
          <FilterSelect
            value={list.filters.buildingId}
            onChange={(value) => list.setFilter('buildingId', value)}
            options={buildingOptions}
            allLabel="Tất cả tòa"
          />
        </div>
      )}
      {report.isPending && <LoadingState />}
      {report.isError && <ErrorState error={report.error} />}
      {report.data?.length === 0 && <EmptyState description="Chưa có tòa nhà nào." />}
      {report.data?.map((item) => (
        <BuildingOccupancy key={item.building.id} report={item} />
      ))}
    </div>
  )
}

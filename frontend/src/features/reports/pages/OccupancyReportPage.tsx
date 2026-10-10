import { FilterSelect } from '@/components/shared/FilterSelect'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { useListParams } from '@/hooks/useListParams'
import { ReportPlaceholder, ReportSection } from '../components/ReportSection'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const

/**
 * Báo cáo lấp đầy (US-06.2): tòa → tầng → phòng. Admin lọc theo tòa (lưu trên URL); Manager chỉ
 * có tòa mình nên không có bộ lọc.
 */
export function OccupancyReportPage() {
  const { user } = useAuth()
  const list = useListParams(['buildingId'] as const)
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
      <ReportSection
        title="Lấp đầy theo tòa, tầng, phòng"
        description="Tỷ lệ giường có người của từng tòa, từng tầng; số giường còn trống của từng phòng."
      >
        <ReportPlaceholder />
      </ReportSection>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GENDER } from '@/lib/labels'
import { orDash } from '@/lib/format'
import type { SuccessResponse } from '@/types/api'

interface Building {
  id: string
  name: string
  floors: number
  gender: 'MALE' | 'FEMALE' | null
  description: string | null
  isActive: boolean
}

/**
 * Danh sách tòa nhà — bản tối giản để kiểm chứng buildingScope hoạt động
 * (Admin thấy tất cả, Manager chỉ thấy tòa mình). US-01 sẽ thay bằng DataTable
 * dùng chung, kèm CRUD và bộ lọc phía server.
 */
export function BuildingListPage() {
  const query = useQuery({
    queryKey: ['buildings', {}],
    queryFn: async () => {
      const res = await api.get<SuccessResponse<Building[]>>('/buildings')
      return res.data
    },
  })

  return (
    <>
      <PageHeader
        title="Tòa nhà"
        description={
          query.data ? `${query.data.meta?.total ?? 0} tòa trong phạm vi của bạn` : undefined
        }
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} />}

      {query.data?.data.length === 0 && (
        <EmptyState description="Chưa có tòa nhà nào được tạo." />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.data.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{b.name}</CardTitle>
              {b.gender && (
                <StatusBadge label={GENDER[b.gender].label} tone={GENDER[b.gender].tone} />
              )}
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1 text-sm">
              <p>{b.floors} tầng</p>
              <p>{orDash(b.description)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

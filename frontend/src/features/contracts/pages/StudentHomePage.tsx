import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMyContracts } from '../hooks/useContracts'

/**
 * Trang chỗ ở của sinh viên (US-03.5).
 *
 * Nằm trong features/contracts vì dữ liệu hiển thị đều lấy từ hợp đồng đang
 * hiệu lực: tòa/phòng/giường, bạn cùng phòng, hạn hợp đồng. US-03 sẽ dùng chung
 * hook và type với màn hình quản lý hợp đồng của Manager.
 */
export function StudentHomePage() {
  const { user } = useAuth()
  const contracts = useMyContracts()
  const waiting = contracts.data?.find((c) => c.status === 'DRAFT')

  return (
    <>
      <PageHeader title="Trang cá nhân" description={`Xin chào, ${user?.fullName ?? ''}`} />

      {waiting && (
        <div className="tone-warning mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
          <span>
            Đơn của bạn đã được duyệt: giường {waiting.bed.code} phòng {waiting.bed.room.code} tòa{' '}
            {waiting.bed.room.building.name}. Hợp đồng {waiting.code} đang chờ bạn ký.
          </span>
          <Button asChild size="sm">
            <Link to={`/student/contracts/${waiting.id}`}>Xem và ký</Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chỗ ở hiện tại</CardTitle>
          <CardDescription>
            Bạn chưa có chỗ ở. Phòng và giường sẽ hiện ở đây sau khi đơn được duyệt và bạn ký
            hợp đồng.
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}

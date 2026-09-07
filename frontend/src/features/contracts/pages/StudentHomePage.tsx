import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'

/**
 * Trang chỗ ở của sinh viên (US-03.5).
 *
 * Nằm trong features/contracts vì dữ liệu hiển thị đều lấy từ hợp đồng đang
 * hiệu lực: tòa/phòng/giường, bạn cùng phòng, hạn hợp đồng. US-03 sẽ dùng chung
 * hook và type với màn hình quản lý hợp đồng của Manager.
 */
export function StudentHomePage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader title="Trang cá nhân" description={`Xin chào, ${user?.fullName ?? ''}`} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chỗ ở hiện tại</CardTitle>
          <CardDescription>Đếch có gì đâu bnaj ei</CardDescription>
        </CardHeader>
     
      </Card>
    </>
  )
}

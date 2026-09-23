import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** US-06 sẽ thay bằng dashboard thống kê thật. */
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader title="Tổng quan" description={`Xin chào, ${user?.fullName ?? ''}`} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phạm vi dữ liệu của bạn</CardTitle>
          <CardDescription>
            {user?.role === 'ADMIN'
              ? 'Toàn hệ thống — thấy tất cả các tòa nhà.'
              : 'Chỉ tòa nhà được gán quản lý.'}
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}

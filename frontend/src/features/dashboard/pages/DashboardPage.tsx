import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { formatMoney, formatPercent } from '@/lib/format'
import type { OverviewReport } from '@/types/report'
import { RequestStatusChart } from '../components/RequestStatusChart'
import { RevenueChart } from '../components/RevenueChart'
import { useOverviewReport } from '../hooks/useDashboard'

/**
 * Tổng quan (US-06.1) — số liệu chính ngay khi đăng nhập. Backend tự giới hạn phạm vi: Manager
 * chỉ thấy tòa mình. Hai ô hóa đơn bấm được để sang bảng Hóa đơn đã lọc sẵn.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const overview = useOverviewReport()
  const scope = user?.role === 'ADMIN' ? 'số liệu toàn hệ thống' : 'số liệu tòa bạn quản lý'

  return (
    <>
      <PageHeader title="Tổng quan" description={`Xin chào, ${user?.fullName ?? ''} — ${scope}.`} />
      {overview.isPending && <LoadingState />}
      {overview.isError && <ErrorState error={overview.error} />}
      {overview.data && <Overview report={overview.data} />}
    </>
  )
}

function Overview({ report }: { report: OverviewReport }) {
  const navigate = useNavigate()
  const { beds, expiringContracts, invoices, requests } = report

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Tỷ lệ lấp đầy" hint={`${beds.occupied}/${beds.total} giường có người`}>
          {formatPercent(beds.occupied, beds.total)}
        </StatCard>
        <StatCard label="Sinh viên đang ở" hint="Hợp đồng đã tới ngày vào ở">
          {report.residents}
        </StatCard>
        <StatCard label="Hợp đồng sắp hết hạn" hint={`Trong ${expiringContracts.withinDays} ngày tới`}>
          {expiringContracts.count}
        </StatCard>
        <StatCard
          label="Chưa thanh toán"
          hint={`${invoices.unpaid.count} hóa đơn`}
          onClick={() => navigate('/admin/invoices?status=UNPAID')}
        >
          {formatMoney(invoices.unpaid.amount)}
        </StatCard>
        <StatCard
          label="Quá hạn"
          hint={`${invoices.overdue.count} hóa đơn`}
          onClick={() => navigate('/admin/invoices?status=OVERDUE')}
        >
          <span className={invoices.overdue.count > 0 ? 'text-destructive' : undefined}>
            {formatMoney(invoices.overdue.amount)}
          </span>
        </StatCard>
        <StatCard label="Sửa chữa đang mở" hint={`${requests.byStatus.PENDING} chờ tiếp nhận`}>
          {requests.open}
        </StatCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh thu 6 tháng gần nhất</CardTitle>
            <CardDescription>Tiền đã thu qua VNPay, tính theo tháng thanh toán.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={report.revenue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yêu cầu sửa chữa</CardTitle>
            <CardDescription>Số yêu cầu theo trạng thái hiện tại.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestStatusChart counts={requests.byStatus} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

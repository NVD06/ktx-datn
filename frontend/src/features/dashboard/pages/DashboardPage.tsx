import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { formatMoney, formatPercent } from '@/lib/format'
import { GENDER, HYGIENE_WARNING_SCORE, ROLE, hygieneScore } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { OverviewReport } from '@/types/report'
import { RequestStatusChart } from '../components/RequestStatusChart'
import { RevenueChart } from '../components/RevenueChart'
import { useOverviewReport } from '../hooks/useDashboard'

/**
 * Tổng quan (US-06.1) — Admin xem toàn cảnh và so sánh các tòa, Manager xem việc chờ xử lý của
 * tòa mình. Backend tự giới hạn phạm vi: Manager chỉ thấy tòa mình. Các ô bấm được để sang bảng
 * đã lọc sẵn.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const overview = useOverviewReport()
  const isAdmin = user?.role === 'ADMIN'
  const building = overview.data?.buildings[0]

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={
          isAdmin
            ? `Xin chào, ${user?.fullName ?? ''} — số liệu toàn hệ thống.`
            : `Xin chào, ${user?.fullName ?? ''} — việc cần làm ở tòa ${building?.name ?? 'bạn quản lý'}.`
        }
      />
      {overview.isPending && <LoadingState />}
      {overview.isError && <ErrorState error={overview.error} />}
      {overview.data &&
        (isAdmin ? <AdminOverview report={overview.data} /> : <ManagerOverview report={overview.data} />)}
    </>
  )
}

function AdminOverview({ report }: { report: OverviewReport }) {
  const navigate = useNavigate()
  const { beds, invoices, requests, todo, expiringContracts, openPeriod, buildings } = report
  const tasks = [
    {
      dot: 'bg-(--tone-info-fg)',
      label: 'Đơn đăng ký chờ duyệt',
      hint: openPeriod ? `${openPeriod.name} đang mở` : 'Không có đợt đăng ký đang mở',
      count: todo.registrations,
      to: '/admin/registrations?status=PENDING',
    },
    {
      dot: 'bg-(--tone-danger-fg)',
      label: 'Hóa đơn quá hạn',
      hint: `${formatMoney(invoices.overdue.amount)} · cân nhắc nhắc sinh viên`,
      count: invoices.overdue.count,
      to: '/admin/invoices?status=OVERDUE',
    },
    {
      dot: 'bg-primary',
      label: 'Sửa chữa chờ tiếp nhận',
      hint: 'Chưa có người nhận',
      count: requests.byStatus.PENDING,
      to: '/admin/maintenance?status=PENDING',
    },
    {
      dot: 'bg-muted-foreground',
      label: 'Hợp đồng sắp hết hạn',
      hint: `Trong ${expiringContracts.withinDays} ngày tới`,
      count: expiringContracts.count,
      to: '/admin/contracts?status=ACTIVE',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Sinh viên đang ở" value={report.residents.toLocaleString('vi-VN')} hint={`trên ${beds.total} giường`} />
        <Kpi
          label="Tỷ lệ lấp đầy"
          value={formatPercent(beds.occupied, beds.total)}
          hint={`${beds.occupied}/${beds.total} giường có người`}
        />
        <Kpi
          label="Hóa đơn chưa thu"
          value={invoices.unpaid.count}
          hint={`tổng ${formatMoney(invoices.unpaid.amount)}`}
          onClick={() => navigate('/admin/invoices?status=UNPAID')}
        />
        <Kpi
          label="Yêu cầu sửa chữa mở"
          value={requests.open}
          hint={`${requests.byStatus.PENDING} chờ tiếp nhận`}
          onClick={() => navigate('/admin/maintenance?status=OPEN')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tình trạng các tòa</CardTitle>
            <MoreLink to="/admin/buildings">Quản lý tòa nhà</MoreLink>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tòa</TableHead>
                  <TableHead>Quản lý tòa</TableHead>
                  <TableHead className="text-right">Phòng</TableHead>
                  <TableHead className="text-right">Đang ở / Sức chứa</TableHead>
                  <TableHead>Lấp đầy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((b) => {
                  const rate = b.beds.total ? (b.beds.occupied / b.beds.total) * 100 : 0
                  return (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/admin/buildings/${b.id}`)}>
                      <TableCell>
                        <p className="font-semibold">Tòa {b.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {GENDER[b.gender].label} · {b.floors} tầng{!b.isActive && ' · ngừng hoạt động'}
                        </p>
                      </TableCell>
                      <TableCell>{b.manager?.fullName ?? <span className="text-muted-foreground">Chưa gán</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.rooms}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.beds.occupied} / {b.beds.total}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 min-w-24 flex-1 overflow-hidden rounded-full">
                            <div
                              className={cn('h-full rounded-full', rate >= 95 ? 'bg-primary' : 'bg-(--chart-2)')}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold tabular-nums">
                            {formatPercent(b.beds.occupied, b.beds.total)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Việc cần xử lý</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className="hover:border-primary/50 hover:bg-accent/40 flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', t.dot)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-muted-foreground text-xs">{t.hint}</p>
                </div>
                <span className={cn('text-sm font-semibold tabular-nums', t.count === 0 && 'text-muted-foreground')}>
                  {t.count}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Doanh thu đã thu theo tháng</CardTitle>
            <span className="text-muted-foreground text-xs">triệu đồng</span>
          </CardHeader>
          <CardContent>
            <RevenueChart data={report.revenue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tài khoản mới tạo</CardTitle>
            <MoreLink to="/admin/users">Phân quyền</MoreLink>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {report.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {initials(u.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.fullName}</p>
                    <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                  </div>
                  <StatusBadge {...ROLE[u.role]} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return `${words[0]?.[0] ?? ''}${words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''}`.toUpperCase()
}

function Kpi({ label, value, hint, onClick }: { label: string; value: ReactNode; hint: string; onClick?: () => void }) {
  const body = (
    <Card className={cn('h-full', onClick && 'hover:bg-accent/50 transition-colors')}>
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
  if (!onClick) return body
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-visible:ring-ring rounded-xl text-left outline-none focus-visible:ring-2"
    >
      {body}
    </button>
  )
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-primary flex items-center gap-1 text-sm font-medium hover:underline">
      {children}
      <ArrowRight className="size-4" />
    </Link>
  )
}

function ManagerOverview({ report }: { report: OverviewReport }) {
  const navigate = useNavigate()
  const { beds, invoices, todo, expiringContracts, openPeriod } = report
  const building = report.buildings[0]
  const month = report.revenue.at(-1)?.month
  const tasks: { count: number; label: string; to: string; icon: LucideIcon }[] = [
    { count: todo.registrations, label: 'Đơn đăng ký chờ duyệt', to: '/admin/registrations?status=PENDING', icon: ClipboardList },
    { count: todo.unsignedContracts, label: 'Hợp đồng chờ sinh viên ký', to: '/admin/contracts?status=DRAFT', icon: FileSignature },
    { count: todo.extensionRequests, label: 'Yêu cầu gia hạn chờ duyệt', to: '/admin/contracts?extension=PENDING', icon: CalendarClock },
    { count: todo.newRequests, label: 'Sửa chữa mới gửi', to: '/admin/maintenance', icon: Wrench },
    { count: todo.unbilledRooms, label: 'Phòng chưa chốt điện nước tháng này', to: '/admin/utilities', icon: Zap },
    {
      count: todo.lowHygieneRooms,
      label: `Phòng dưới ${HYGIENE_WARNING_SCORE} điểm vệ sinh`,
      to: `/admin/hygiene?belowWarning=true${month ? `&month=${month}` : ''}`,
      icon: Sparkles,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tỷ lệ lấp đầy" hint={`${beds.occupied}/${beds.total} giường có người`}>
          {formatPercent(beds.occupied, beds.total)}
        </StatCard>
        <StatCard label="Sinh viên đang ở" hint="Hợp đồng đã tới ngày vào ở">
          {report.residents}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Việc chờ xử lý</CardTitle>
          <CardDescription>Bấm vào từng mục để mở danh sách đã lọc sẵn.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map(({ count, label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="hover:border-primary/50 hover:bg-accent/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-xl font-semibold tabular-nums', count === 0 && 'text-muted-foreground')}>{count}</p>
                <p className="text-muted-foreground text-xs leading-snug">{label}</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Yêu cầu sửa chữa</CardTitle>
            <CardDescription>Số yêu cầu theo trạng thái hiện tại.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestStatusChart counts={report.requests.byStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tòa {building?.name ?? ''} tháng này</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <Fact label="Điểm vệ sinh trung bình">
                {building?.hygieneAverage == null ? 'Chưa chấm' : <StatusBadge {...hygieneScore(building.hygieneAverage)} />}
              </Fact>
              <Fact label={`Hợp đồng hết hạn trong ${expiringContracts.withinDays} ngày`}>{expiringContracts.count}</Fact>
              <Fact label="Sửa chữa đang mở">{report.requests.open}</Fact>
              <Fact label="Đợt đăng ký">{openPeriod ? `${openPeriod.name} (đang mở)` : 'Không có đợt mở'}</Fact>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

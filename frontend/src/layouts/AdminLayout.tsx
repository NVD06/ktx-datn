import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Building2,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  FileSignature,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Receipt,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import { LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog'
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Bỏ trống = cả ADMIN và MANAGER đều thấy. */
  roles?: Role[]
}

// Phòng và giường không có mục riêng: vào qua Tòa nhà → chi tiết tòa → chi tiết phòng.
// "Báo cáo" sáng cho mọi tab /admin/reports/* (NavLink không đặt `end`).
const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/buildings', label: 'Tòa nhà', icon: Building2 },
  { to: '/admin/room-types', label: 'Loại phòng', icon: Layers },
  { to: '/admin/registration-periods', label: 'Đợt đăng ký', icon: CalendarRange },
  { to: '/admin/registrations', label: 'Đơn đăng ký', icon: ClipboardList },
  { to: '/admin/contracts', label: 'Hợp đồng', icon: FileSignature },
  { to: '/admin/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/admin/utilities', label: 'Chốt điện nước', icon: Zap },
  { to: '/admin/maintenance', label: 'Sửa chữa', icon: Wrench },
  { to: '/admin/hygiene', label: 'Vệ sinh', icon: Sparkles },
  { to: '/admin/reports', label: 'Báo cáo', icon: ChartColumn },
  { to: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
]

export function AdminLayout() {
  const { user } = useAuth()
  const logout = useLogout()
  const [changingPassword, setChangingPassword] = useState(false)

  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)))

  return (
    <div className="flex min-h-svh">
      {/* sticky + h-svh: bảng dài cuộn thì sidebar đứng yên, tài khoản và nút Đăng xuất luôn ở đáy màn hình. */}
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 flex h-svh w-60 shrink-0 flex-col border-r">
        <div className="border-sidebar-border border-b px-4 py-4">
          <Link to="/admin/dashboard" className="font-semibold text-white">
            Quản lý KTX
          </Link>
          <p className="text-sidebar-foreground/60 mt-0.5 text-xs">
            {user?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Quản lý tòa nhà'}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary border-l-2 font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-2 border-transparent',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-sidebar-border space-y-2 border-t p-3">
          <div className="px-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="text-sidebar-foreground/60 truncate text-xs">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-white w-full bg-transparent"
            onClick={() => setChangingPassword(true)}
          >
            <KeyRound className="size-4" />
            Đổi mật khẩu
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-white w-full bg-transparent"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Không đặt overflow ở đây: overflow biến <main> thành khung cuộn riêng, đầu trang (PageHeader)
          sẽ dính theo khung đó thay vì theo trang. Bảng rộng tự cuộn ngang trong khung của bảng (min-w-0). */}
      <main className="min-w-0 flex-1 p-6">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </div>
  )
}

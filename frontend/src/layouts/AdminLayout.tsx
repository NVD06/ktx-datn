import { Link, NavLink, Outlet } from 'react-router-dom'
import { Building2, LayoutDashboard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// US-01 trở đi sẽ bổ sung: Phòng, Giường, Đơn đăng ký, Hợp đồng, Hóa đơn,
// Sửa chữa, Vệ sinh, Báo cáo.
const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/buildings', label: 'Tòa nhà', icon: Building2 },
]

export function AdminLayout() {
  const { user } = useAuth()
  const logout = useLogout()

  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)))

  return (
    <div className="flex min-h-svh">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-60 shrink-0 flex-col border-r">
        <div className="border-sidebar-border border-b px-4 py-4">
          <Link to="/admin/dashboard" className="font-semibold text-white">
            Quản lý KTX
          </Link>
          <p className="text-sidebar-foreground/60 mt-0.5 text-xs">
            {user?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Quản lý tòa nhà'}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
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
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

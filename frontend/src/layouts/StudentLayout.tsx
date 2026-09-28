import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

// US-05 sẽ bổ sung: Sửa chữa.
const NAV = [
  { to: '/student', label: 'Trang cá nhân' },
  { to: '/student/rooms', label: 'Chỗ trống' },
  { to: '/student/registrations', label: 'Đơn của tôi' },
  { to: '/student/contracts', label: 'Hợp đồng' },
  { to: '/student/invoices', label: 'Hóa đơn' },
  { to: '/student/profile', label: 'Hồ sơ' },
]

export function StudentLayout() {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <div className="min-h-svh">
      <header className="border-primary bg-card/90 sticky top-0 z-10 border-b-2 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:gap-6">
          <Link to="/student" className="text-foreground shrink-0 font-semibold">
            Ký túc xá
          </Link>

          {/* Điện thoại không đủ chỗ cho 6 mục: cuộn ngang thay vì tràn cả trang. */}
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                // '/student' là tiền tố của mọi trang sinh viên — thiếu `end` thì nó luôn sáng.
                end={to === '/student'}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user?.fullName}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}

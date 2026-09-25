import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

// US-04 trở đi sẽ bổ sung: Hóa đơn, Sửa chữa.
const NAV = [
  { to: '/student', label: 'Trang cá nhân' },
  { to: '/student/rooms', label: 'Chỗ trống' },
  { to: '/student/registrations', label: 'Đơn của tôi' },
  { to: '/student/contracts', label: 'Hợp đồng' },
  { to: '/student/profile', label: 'Hồ sơ' },
]

export function StudentLayout() {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <div className="min-h-svh">
      <header className="border-primary bg-card/90 sticky top-0 z-10 border-b-2 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link to="/student" className="text-foreground font-semibold">
            Ký túc xá
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                // '/student' là tiền tố của mọi trang sinh viên — thiếu `end` thì nó luôn sáng.
                end={to === '/student'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
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

          <div className="flex items-center gap-3">
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

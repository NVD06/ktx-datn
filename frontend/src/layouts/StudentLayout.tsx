import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BedDouble,
  ClipboardList,
  FileSignature,
  House,
  LogOut,
  Menu,
  Receipt,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

// US-05 sẽ bổ sung: Sửa chữa.
const NAV = [
  { to: '/student', label: 'Trang cá nhân', icon: House },
  { to: '/student/rooms', label: 'Chỗ trống', icon: BedDouble },
  { to: '/student/registrations', label: 'Đơn của tôi', icon: ClipboardList },
  { to: '/student/contracts', label: 'Hợp đồng', icon: FileSignature },
  { to: '/student/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/student/profile', label: 'Hồ sơ', icon: UserRound },
]

/**
 * Sidebar khu sinh viên — cùng giao diện với khu quản trị.
 *
 * Từ `md` trở lên sidebar nằm cố định bên trái. Điện thoại không đủ chỗ nên chỉ còn một thanh trên có nút mở menu,
 * sidebar trượt ra từ trái (Sheet) và tự đóng khi chọn một mục.
 */
export function StudentLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* sticky + h-svh: trang dài cuộn thì sidebar vẫn đứng yên, nút Đăng xuất luôn ở đáy màn hình. */}
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r md:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-10 flex h-14 items-center gap-2 px-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mở menu"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <Link to="/student" className="text-sidebar-accent-foreground font-semibold">
            Ký túc xá
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="bg-sidebar text-sidebar-foreground border-sidebar-border gap-0 data-[side=left]:w-64"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Các trang của khu sinh viên</SheetDescription>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <>
      <div className="border-sidebar-border border-b px-4 py-4">
        <Link to="/student" className="text-sidebar-accent-foreground font-semibold" onClick={onNavigate}>
          Ký túc xá
        </Link>
        <p className="text-sidebar-foreground/60 mt-0.5 text-xs">Sinh viên</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            // '/student' là tiền tố của mọi trang sinh viên — thiếu `end` thì nó luôn sáng.
            end={to === '/student'}
            onClick={onNavigate}
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
          <p className="text-sidebar-accent-foreground truncate text-sm font-medium">{user?.fullName}</p>
          <p className="text-sidebar-foreground/60 truncate text-xs">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full bg-transparent"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" />
          Đăng xuất
        </Button>
      </div>
    </>
  )
}

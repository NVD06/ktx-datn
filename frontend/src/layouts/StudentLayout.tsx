import { Suspense, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import {
  BedDouble,
  Bell,
  ClipboardList,
  FileSignature,
  House,
  Menu,
  Receipt,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react'
import { LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useMyAnnouncements } from '@/features/announcements/hooks/useAnnouncements'
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { SidebarContent } from '@/layouts/SidebarContent'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/student', label: 'Trang cá nhân', icon: House },
  { to: '/student/announcements', label: 'Thông báo', icon: Bell },
  { to: '/student/rooms', label: 'Chỗ trống', icon: BedDouble },
  { to: '/student/registrations', label: 'Đơn của tôi', icon: ClipboardList },
  { to: '/student/contracts', label: 'Hợp đồng', icon: FileSignature },
  { to: '/student/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/student/maintenance', label: 'Sửa chữa', icon: Wrench },
  { to: '/student/hygiene', label: 'Vệ sinh', icon: Sparkles },
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
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const [changingPassword, setChangingPassword] = useState(false)
  const unread = useMyAnnouncements().data?.filter((a) => !a.readAt).length ?? 0
  const sidebar = {
    homeTo: '/student',
    title: 'Ký túc xá',
    subtitle: 'Sinh viên',
    items: NAV.map((i) => (i.to === '/student/announcements' ? { ...i, badge: unread } : i)),
    onChangePassword: () => setChangingPassword(true),
  }

  return (
    <div className="flex min-h-svh">
      {/* sticky + h-svh: trang dài cuộn thì sidebar vẫn đứng yên, nút Đăng xuất luôn ở đáy màn hình. */}
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 z-20 hidden h-svh shrink-0 flex-col overflow-hidden border-r transition-[width] md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarContent {...sidebar} collapsed={collapsed} onToggle={toggleCollapsed} />
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
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
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
          <SidebarContent {...sidebar} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Nằm ngoài Sheet: bấm từ menu trượt thì menu đóng lại mà hộp thoại vẫn mở. */}
      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </div>
  )
}
